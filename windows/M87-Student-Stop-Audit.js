'use strict';
// Read-only operator-assisted stop audit. No student IDs, images, or credentials in reports.
const fs=require('node:fs');
const readline=require('node:readline/promises');
const {stdin,stdout}=require('node:process');
const {request}=require('./M84-Enrollment-Visibility');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function evaluate(before,after,{target,stopAt,graceMs=6000}={}){
 const issues=[];
 if(typeof target!=='string'||!target.trim())issues.push('missing_target');
 if(!Number.isFinite(stopAt))issues.push('missing_stop_timestamp');
 if(!Number.isInteger(graceMs)||graceMs<1000||graceMs>30000)issues.push('invalid_grace');
 const valid=s=>s&&Array.isArray(s.status?.students)&&Array.isArray(s.frames?.frames)&&s.status.mode==='live'&&s.status.features?.remoteControl===false;
 if(!valid(before)||!Array.isArray(after)||after.length<2||after.some(s=>!valid(s)))issues.push('invalid_samples_or_unsafe_mode');
 if(issues.length)return {stage:'M87',passed:false,issues,scope:'operator-assisted-read-only',liveInputEnabled:false};
 const beforeStudent=before.status.students.find(s=>s.id===target);
 const beforeFrame=before.frames.frames.find(f=>f.id===target);
 if(!beforeStudent?.online||!beforeStudent?.approved||!beforeFrame||!Number.isFinite(beforeFrame.at))issues.push('no_active_preview_before_stop');
 let last=beforeFrame?.at;
 for(const [i,s] of after.entries()){
  const student=s.status.students.find(x=>x.id===target);
  const frame=s.frames.frames.find(x=>x.id===target);
  if(student?.approved===true && student?.online===true && frame && Number.isFinite(frame.at) && frame.at>stopAt+graceMs)issues.push(`preview_resumed_after_stop_sample_${i+1}`);
  if(frame&&Number.isFinite(frame.at)&&Number.isFinite(last)&&frame.at>last&&frame.at>stopAt+graceMs)issues.push(`frame_advanced_after_stop_sample_${i+1}`);
  if(frame&&Number.isFinite(frame.at))last=Math.max(last??-Infinity,frame.at);
 }
 const final=after.at(-1);
 const finalFrame=final.frames.frames.find(f=>f.id===target);
 if(finalFrame&&Number.isFinite(finalFrame.at)&&finalFrame.at>stopAt+graceMs)issues.push('preview_present_after_grace');
 return {stage:'M87',passed:issues.length===0,issues:[...new Set(issues)],postStopSamples:after.length,graceMs,scope:'operator-assisted-read-only',liveInputEnabled:false,limitations:'Metadata only. A pass cannot prove local stop was actually pressed, consent revoked, or reconnection requires new consent. Verify visibly on student and teacher devices.'};
}
async function snapshot(port,cookie){const [status,frames]=await Promise.all(['/api/status','/api/frames'].map(path=>request({port,path,cookie})));return {status:status.json,frames:frames.json};}
async function collect({port=4177,password,target,graceMs=6000,intervalMs=2000,count=3,confirmStop}={}){
 if(!password)throw Error('FBS_TEACHER_PASSWORD required');
 if(typeof target!=='string'||!target.trim())throw Error('target student ID required');
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('invalid port');
 if(!Number.isInteger(intervalMs)||intervalMs<500||intervalMs>30000)throw Error('invalid interval');
 if(!Number.isInteger(count)||count<2||count>10)throw Error('invalid sample count');
 if(!Number.isInteger(graceMs)||graceMs<1000||graceMs>30000)throw Error('invalid grace');
 if(typeof confirmStop!=='function')throw Error('operator confirmation required');
 const login=await request({port,path:'/api/login',method:'POST',body:{password}});
 if(!login.cookie?.startsWith('fbs_session='))throw Error('missing session cookie');
 try{
  const before=await snapshot(port,login.cookie);
  if(!before.frames?.frames?.some(f=>f.id===target))throw Error('target preview not active before stop');
  await confirmStop(); // operator must stop locally; tool never sends remote stop or simulates consent
  const stopAt=Date.now();
  await sleep(graceMs+250);
  const after=[];
  for(let i=0;i<count;i++){if(i)await sleep(intervalMs);after.push(await snapshot(port,login.cookie));}
  return evaluate(before,after,{target,stopAt,graceMs});
 }finally{await request({port,path:'/api/logout',method:'POST',cookie:login.cookie}).catch(()=>{});}
}
async function main(args){
 const [target,reportPath='m87-stop-report.json',portRaw='4177']=args;
 const rl=readline.createInterface({input:stdin,output:stdout});
 try{
  const result=await collect({target,port:Number(portRaw),password:process.env.FBS_TEACHER_PASSWORD,confirmStop:async()=>{
   const answer=await rl.question('On the STUDENT device, press Stop Sharing. After observing it, type STOP and press Enter: ');
   if(answer.trim()!=='STOP')throw Error('operator did not confirm stop');
  }});
  fs.writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
 }finally{rl.close();}
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error('M87 audit failed:',e.message);process.exitCode=1;});
module.exports={evaluate,collect};
