'use strict';
// Read-only, operator-assisted fresh consent -> preview -> second stop verification.
const fs=require('node:fs');
const readline=require('node:readline/promises');
const {stdin,stdout}=require('node:process');
const {request}=require('./M84-Enrollment-Visibility');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function valid(s){return !!s&&s.status?.mode==='live'&&s.status.features?.remoteControl===false&&Array.isArray(s.status.students)&&Array.isArray(s.frames?.frames);}
function state(s,id){return {student:s.status.students.find(x=>x.id===id),frame:s.frames.frames.find(x=>x.id===id)};}
function evaluate({baseline,consented,stopped,target,consentAt,stopAt,graceMs=6000}={}){
 const issues=[];
 if(typeof target!=='string'||!target.trim())issues.push('missing_target');
 if(!Number.isFinite(consentAt)||!Number.isFinite(stopAt)||stopAt<=consentAt)issues.push('invalid_event_order');
 if(!Number.isInteger(graceMs)||graceMs<1000||graceMs>30000)issues.push('invalid_grace');
 if(!valid(baseline)||!Array.isArray(consented)||consented.length<2||consented.some(s=>!valid(s))||!Array.isArray(stopped)||stopped.length<2||stopped.some(s=>!valid(s)))issues.push('invalid_samples_or_unsafe_mode');
 if(issues.length)return {stage:'M89',passed:false,issues,liveInputEnabled:false};
 const b=state(baseline,target);
 if(!b.student?.online)issues.push('student_not_online_at_baseline');
 if(b.student?.approved===true)issues.push('consent_already_active_at_baseline');
 if(Number.isFinite(b.frame?.at)&&b.frame.at>consentAt)issues.push('fresh_preview_before_consent');
 let observedFresh=false;
 for(let i=0;i<consented.length;i++){
  const {student,frame}=state(consented[i],target);
  if(!student?.online||student.approved!==true)issues.push(`fresh_consent_not_active_sample_${i+1}`);
  if(Number.isFinite(frame?.at)&&frame.at>consentAt&&frame.at<=stopAt)observedFresh=true;
 }
 if(!observedFresh)issues.push('no_fresh_preview_after_consent');
 for(let i=0;i<stopped.length;i++){
  const {student,frame}=state(stopped[i],target);
  if(student?.approved===true)issues.push(`approval_active_after_second_stop_sample_${i+1}`);
  if(Number.isFinite(frame?.at)&&frame.at>stopAt+graceMs)issues.push(`preview_continues_after_second_stop_sample_${i+1}`);
 }
 return {stage:'M89',passed:issues.length===0,issues:[...new Set(issues)],freshPreviewObserved:observedFresh,consentSamples:consented.length,postStopSamples:stopped.length,graceMs,liveInputEnabled:false,scope:'operator-assisted-read-only',limitations:'Server metadata only. Operator must verify explicit new consent and local Stop Sharing; does not independently prove UI enforcement.'};
}
async function snapshot(port,cookie){const [status,frames]=await Promise.all(['/api/status','/api/frames'].map(path=>request({port,path,cookie})));return {status:status.json,frames:frames.json};}
async function collect({port=4177,password,target,graceMs=6000,intervalMs=2000,count=3,confirmConsent,confirmStop}={}){
 if(typeof password!=='string'||!password)throw Error('FBS_TEACHER_PASSWORD required');
 if(typeof target!=='string'||!target.trim())throw Error('student ID required');
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('invalid port');
 if(!Number.isInteger(graceMs)||graceMs<1000||graceMs>30000)throw Error('invalid grace');
 if(!Number.isInteger(intervalMs)||intervalMs<500||intervalMs>30000)throw Error('invalid interval');
 if(!Number.isInteger(count)||count<2||count>10)throw Error('invalid count');
 if(typeof confirmConsent!=='function'||typeof confirmStop!=='function')throw Error('operator confirmation required');
 const login=await request({port,path:'/api/login',method:'POST',body:{password}});
 if(!login.cookie?.startsWith('fbs_session='))throw Error('missing session cookie');
 try{
  const baseline=await snapshot(port,login.cookie);
  if(!valid(baseline)||baseline.status.students.find(s=>s.id===target)?.approved!==false)throw Error('student must be present with consent OFF before test');
  const consentAt=Date.now();await confirmConsent();
  const consented=[];for(let i=0;i<count;i++){if(i)await sleep(intervalMs);consented.push(await snapshot(port,login.cookie));}
  await confirmStop();const stopAt=Date.now();await sleep(graceMs+250);
  const stopped=[];for(let i=0;i<count;i++){if(i)await sleep(intervalMs);stopped.push(await snapshot(port,login.cookie));}
  return evaluate({baseline,consented,stopped,target,consentAt,stopAt,graceMs});
 }finally{await request({port,path:'/api/logout',method:'POST',cookie:login.cookie}).catch(()=>{});}
}
async function main(args){
 const [target,reportPath='m89-consent-cycle-report.json',portRaw='4177']=args;
 const rl=readline.createInterface({input:stdin,output:stdout});
 try{
  const result=await collect({target,port:Number(portRaw),password:process.env.FBS_TEACHER_PASSWORD,
   confirmConsent:async()=>{const a=await rl.question('On STUDENT grant NEW explicit screen consent. Type CONSENT after verifying: ');if(a.trim()!=='CONSENT')throw Error('new consent not confirmed');},
   confirmStop:async()=>{const a=await rl.question('On STUDENT press Stop Sharing AGAIN. Type STOP after verifying: ');if(a.trim()!=='STOP')throw Error('second stop not confirmed');}});
  fs.writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
 }finally{rl.close();}
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error('M89 audit failed:',e.message);process.exitCode=1;});
module.exports={evaluate,collect};
