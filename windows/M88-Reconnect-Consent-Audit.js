'use strict';
// Read-only operator-assisted audit: after local Stop Sharing and reconnect, no preview may resume without new consent.
const fs=require('node:fs');
const readline=require('node:readline/promises');
const {stdin,stdout}=require('node:process');
const {request}=require('./M84-Enrollment-Visibility');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function valid(s){return !!s&&s.status?.mode==='live'&&s.status.features?.remoteControl===false&&Array.isArray(s.status.students)&&Array.isArray(s.frames?.frames);}
function evaluate(before,after,{target,stoppedAt,reconnectedAt,graceMs=6000}={}){
 const issues=[];
 if(typeof target!=='string'||!target.trim())issues.push('missing_target');
 if(!Number.isFinite(stoppedAt)||!Number.isFinite(reconnectedAt)||reconnectedAt<stoppedAt)issues.push('invalid_event_timestamps');
 if(!Number.isInteger(graceMs)||graceMs<1000||graceMs>30000)issues.push('invalid_grace');
 if(!valid(before)||!Array.isArray(after)||after.length<2||after.some(s=>!valid(s)))issues.push('invalid_samples_or_unsafe_mode');
 if(issues.length)return {stage:'M88',passed:false,issues,liveInputEnabled:false};
 const initial=before.status.students.find(s=>s.id===target);
 const initialFrame=before.frames.frames.find(f=>f.id===target);
 if(!initial?.online||!initial?.approved||!Number.isFinite(initialFrame?.at))issues.push('no_active_preview_before_stop');
 const reconnectSeen=after.some(s=>s.status.students.some(x=>x.id===target&&x.online===true));
 if(!reconnectSeen)issues.push('reconnect_not_observed');
 for(const [i,s] of after.entries()){
  const student=s.status.students.find(x=>x.id===target);
  const frame=s.frames.frames.find(x=>x.id===target);
  if(student?.online===true&&student?.approved===true)issues.push(`approval_active_after_reconnect_sample_${i+1}`);
  if(Number.isFinite(frame?.at)&&frame.at>stoppedAt+graceMs)issues.push(`new_preview_after_stop_sample_${i+1}`);
 }
 return {stage:'M88',passed:issues.length===0,issues:[...new Set(issues)],postReconnectSamples:after.length,graceMs,liveInputEnabled:false,scope:'operator-assisted-read-only',limitations:'A pass only checks server metadata. Operator must visually confirm local stop, reconnect, and no new consent; it cannot prove consent behavior on its own.'};
}
async function snapshot(port,cookie){const [status,frames]=await Promise.all(['/api/status','/api/frames'].map(path=>request({port,path,cookie})));return {status:status.json,frames:frames.json};}
async function collect({port=4177,password,target,graceMs=6000,intervalMs=2000,count=3,confirmStop,confirmReconnect}={}){
 if(typeof password!=='string'||!password)throw Error('FBS_TEACHER_PASSWORD required');
 if(typeof target!=='string'||!target.trim())throw Error('student ID required');
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('invalid port');
 if(!Number.isInteger(graceMs)||graceMs<1000||graceMs>30000)throw Error('invalid grace');
 if(!Number.isInteger(intervalMs)||intervalMs<500||intervalMs>30000)throw Error('invalid interval');
 if(!Number.isInteger(count)||count<2||count>10)throw Error('invalid count');
 if(typeof confirmStop!=='function'||typeof confirmReconnect!=='function')throw Error('operator confirmation required');
 const login=await request({port,path:'/api/login',method:'POST',body:{password}});
 if(!login.cookie?.startsWith('fbs_session='))throw Error('missing session cookie');
 try{
  const before=await snapshot(port,login.cookie);
  if(!before.frames?.frames?.some(f=>f.id===target))throw Error('target preview not active');
  await confirmStop();const stoppedAt=Date.now();
  await confirmReconnect();const reconnectedAt=Date.now();
  await sleep(graceMs+250);
  const after=[];
  for(let i=0;i<count;i++){if(i)await sleep(intervalMs);after.push(await snapshot(port,login.cookie));}
  return evaluate(before,after,{target,stoppedAt,reconnectedAt,graceMs});
 }finally{await request({port,path:'/api/logout',method:'POST',cookie:login.cookie}).catch(()=>{});}
}
async function main(args){
 const [target,reportPath='m88-reconnect-report.json',portRaw='4177']=args;
 const rl=readline.createInterface({input:stdin,output:stdout});
 try{
  const result=await collect({target,port:Number(portRaw),password:process.env.FBS_TEACHER_PASSWORD,
   confirmStop:async()=>{const answer=await rl.question('On STUDENT press Stop Sharing. Type STOP after verifying: ');if(answer.trim()!=='STOP')throw Error('stop not confirmed');},
   confirmReconnect:async()=>{const answer=await rl.question('Reconnect STUDENT without granting new screen consent. Type RECONNECT after verifying: ');if(answer.trim()!=='RECONNECT')throw Error('reconnect not confirmed');}});
  fs.writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
 }finally{rl.close();}
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error('M88 audit failed:',e.message);process.exitCode=1;});
module.exports={evaluate,collect};
