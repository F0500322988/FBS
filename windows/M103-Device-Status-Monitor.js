'use strict';
// Read-only, authenticated local monitoring. Per-run pseudonyms, never persist device IDs.
const fs=require('node:fs');
const crypto=require('node:crypto');
const {request}=require('./M84-Enrollment-Visibility');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function classify(s){
 if(!s||typeof s.id!=='string'||!s.id)return 'invalid';
 if(s.demo===true)return 'demo';
 if(s.approved!==true)return 'unapproved';
 return s.online===true?'online':'offline';
}
function analyze(samples,{expected=21,salt='local'}={}){
 const issues=[],transitions=[],last=new Map(),known=new Set();
 if(!Number.isInteger(expected)||expected<1||expected>40)issues.push('invalid_expected');
 if(!Array.isArray(samples)||samples.length<2)issues.push('insufficient_samples');
 if(typeof salt!=='string'||salt.length<1)issues.push('invalid_salt');
 if(issues.length)return {stage:'M103',passed:false,issues,remoteInputEnabled:false};
 const snapshots=[];
 for(let i=0;i<samples.length;i++){
  const snap=samples[i];
  if(!snap||snap.mode!=='live'||snap.features?.remoteControl!==false||!Array.isArray(snap.students)){
   issues.push('invalid_or_unsafe_snapshot');continue;
  }
  if(snap.students.length>40)issues.push('capacity_exceeded');
  const seen=new Set();let online=0,offline=0,unapproved=0;
  for(const s of snap.students){
   const state=classify(s);
   if(state==='invalid'||state==='demo'){issues.push('invalid_student');continue;}
   if(seen.has(s.id)){issues.push('duplicate_student');continue;}
   seen.add(s.id);known.add(s.id);
   if(state==='online')online++;
   if(state==='offline')offline++;
   if(state==='unapproved')unapproved++;
   const previous=last.get(s.id);
   if(previous&&previous!==state){
    const pseudonym=crypto.createHmac('sha256',salt).update(s.id).digest('hex').slice(0,12);
    transitions.push({sample:i+1,device:pseudonym,from:previous,to:state});
   }
   last.set(s.id,state);
  }
  for(const id of last.keys())if(!seen.has(id)){
   const previous=last.get(id);
   if(previous!=='missing')transitions.push({sample:i+1,device:crypto.createHmac('sha256',salt).update(id).digest('hex').slice(0,12),from:previous,to:'missing'});
   last.set(id,'missing');
  }
  snapshots.push({sample:i+1,online,offline,unapproved,visible:seen.size});
 }
 if(snapshots.length!==samples.length)issues.push('missing_valid_snapshot');
 if(known.size<expected)issues.push('insufficient_unique_devices');
 if(snapshots.at(-1)?.online<expected)issues.push('final_online_below_expected');
 return {stage:'M103',passed:issues.length===0,issues:[...new Set(issues)],expected,samples:snapshots,transitions,remoteInputEnabled:false,limitations:'Read-only status snapshots; transient states depend on polling interval. Device pseudonyms change every run; not proof of physical device identity or screen consent.'};
}
async function monitor({expected=21,count=6,intervalMs=2000,port=4177,password}={}){
 if(!Number.isInteger(count)||count<2||count>120||!Number.isInteger(intervalMs)||intervalMs<500||intervalMs>60000||!Number.isInteger(port)||port<1||port>65535)throw Error('invalid_arguments');
 if(typeof password!=='string'||!password)throw Error('FBS_TEACHER_PASSWORD required');
 const login=await request({port,path:'/api/login',method:'POST',body:{password}});
 if(!login.cookie?.startsWith('fbs_session='))throw Error('missing_session_cookie');
 const samples=[];
 try{
  for(let i=0;i<count;i++){
   if(i)await sleep(intervalMs);
   const result=await request({port,path:'/api/status',cookie:login.cookie});
   samples.push(result.json);
  }
 }finally{await request({port,path:'/api/logout',method:'POST',cookie:login.cookie}).catch(()=>{});}
 return analyze(samples,{expected,salt:crypto.randomBytes(32).toString('hex')});
}
async function main(args){
 const [expectedRaw='21',out='m103-device-status.json',countRaw='6',intervalRaw='2000',portRaw='4177']=args;
 const expected=Number(expectedRaw),count=Number(countRaw),intervalMs=Number(intervalRaw),port=Number(portRaw);
 if(!Number.isInteger(expected)||expected<1||expected>40)throw Error('invalid_expected');
 const report=await monitor({expected,count,intervalMs,port,password:process.env.FBS_TEACHER_PASSWORD});
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify(report,null,2));
 if(!report.passed)process.exitCode=1;
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error('M103 failed:',e.message);process.exitCode=1;});
module.exports={classify,analyze,monitor};
