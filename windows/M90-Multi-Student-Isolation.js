'use strict';
// Read-only, operator-assisted sequential consent isolation audit. Never controls student input.
const fs=require('node:fs');
const readline=require('node:readline/promises');
const {stdin,stdout}=require('node:process');
const {request}=require('./M84-Enrollment-Visibility');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function valid(s){return s?.status?.mode==='live'&&s.status.features?.remoteControl===false&&Array.isArray(s.status.students)&&Array.isArray(s.frames?.frames);}
function lookup(s,id){return {student:s.status.students.find(x=>x.id===id),frame:s.frames.frames.find(x=>x.id===id)};}
function evaluate({baseline,cycles,targets,graceMs=6000}={}){
 const issues=[];
 if(!Array.isArray(targets)||targets.length<2||targets.length>40||targets.some(id=>typeof id!=='string'||!id.trim())||new Set(targets).size!==targets.length)issues.push('invalid_targets');
 if(!Number.isInteger(graceMs)||graceMs<1000||graceMs>30000)issues.push('invalid_grace');
 if(!valid(baseline)||!Array.isArray(cycles)||cycles.length!==targets?.length||cycles.some(c=>!valid(c?.active)||!valid(c?.stopped)))issues.push('invalid_samples_or_unsafe_mode');
 if(issues.length)return {stage:'M90',passed:false,issues,liveInputEnabled:false};
 const baseFrames=new Map();
 for(const id of targets){const b=lookup(baseline,id);if(!b.student?.online)issues.push('target_not_online');if(b.student?.approved!==false)issues.push('target_consent_not_off_at_baseline');baseFrames.set(id,Number.isFinite(b.frame?.at)?b.frame.at:0);}
 for(let i=0;i<cycles.length;i++){
  const c=cycles[i],id=targets[i];
  if(!Number.isFinite(c.consentAt)||!Number.isFinite(c.stopAt)||c.stopAt<=c.consentAt)issues.push(`invalid_event_order_${i+1}`);
  const active=lookup(c.active,id),stopped=lookup(c.stopped,id);
  if(active.student?.approved!==true||!active.student?.online)issues.push(`consent_not_active_${i+1}`);
  if(!Number.isFinite(active.frame?.at)||active.frame.at<=c.consentAt||active.frame.at>c.stopAt)issues.push(`fresh_preview_missing_${i+1}`);
  if(stopped.student?.approved===true)issues.push(`approval_persisted_after_stop_${i+1}`);
  if(Number.isFinite(stopped.frame?.at)&&stopped.frame.at>c.stopAt+graceMs)issues.push(`preview_after_stop_${i+1}`);
  for(let j=0;j<targets.length;j++){
   if(j===i)continue;
   const other=targets[j],a=lookup(c.active,other),s=lookup(c.stopped,other);
   if(a.student?.approved!==false||s.student?.approved!==false)issues.push(`other_consent_changed_${i+1}`);
   const priorStopped=j<i?lookup(cycles[j].stopped,other).frame:null;
   const floor=Number.isFinite(priorStopped?.at)?priorStopped.at:baseFrames.get(other);
   if(Number.isFinite(a.frame?.at)&&a.frame.at>floor)issues.push(`other_preview_updated_${i+1}`);
   if(Number.isFinite(s.frame?.at)&&s.frame.at>floor)issues.push(`other_preview_after_stop_${i+1}`);
  }
  // Prior students must remain stopped during subsequent cycles.
  for(let j=0;j<i;j++){
   const prev=targets[j];if(lookup(c.active,prev).student?.approved!==false)issues.push(`prior_consent_reactivated_${i+1}`);
  }
 }
 return {stage:'M90',passed:issues.length===0,issues:[...new Set(issues)],targetCount:targets.length,cyclesChecked:cycles.length,graceMs,liveInputEnabled:false,scope:'operator-assisted-read-only',limitations:'Server metadata only; visually verify consent and Stop on each student. No automatic consent or remote input.'};
}
async function snapshot(port,cookie){const [status,frames]=await Promise.all(['/api/status','/api/frames'].map(path=>request({port,path,cookie})));return {status:status.json,frames:frames.json};}
async function collect({port=4177,password,targets,graceMs=6000,confirmConsent,confirmStop}={}){
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('invalid port');
 if(typeof password!=='string'||!password)throw Error('FBS_TEACHER_PASSWORD required');
 if(!Array.isArray(targets)||targets.length<2||targets.length>40||new Set(targets).size!==targets.length||targets.some(x=>typeof x!=='string'||!x.trim()))throw Error('provide 2 to 40 unique student IDs');
 if(typeof confirmConsent!=='function'||typeof confirmStop!=='function')throw Error('operator confirmations required');
 const login=await request({port,path:'/api/login',method:'POST',body:{password}});
 if(!login.cookie?.startsWith('fbs_session='))throw Error('missing session cookie');
 try{
  const baseline=await snapshot(port,login.cookie);
  if(!valid(baseline)||targets.some(id=>{const s=lookup(baseline,id).student;return !s?.online||s.approved!==false;}))throw Error('all selected students must be online with screen consent OFF');
  const cycles=[];
  for(const id of targets){
   const consentAt=Date.now();await confirmConsent(id);
   await sleep(1200);const active=await snapshot(port,login.cookie);
   await confirmStop(id);const stopAt=Date.now();await sleep(graceMs+250);
   const stopped=await snapshot(port,login.cookie);
   cycles.push({consentAt,active,stopAt,stopped});
  }
  return evaluate({baseline,cycles,targets,graceMs});
 }finally{await request({port,path:'/api/logout',method:'POST',cookie:login.cookie}).catch(()=>{});}
}
async function main(args){
 const [idsRaw,reportPath='m90-isolation-report.json',portRaw='4177']=args;
 const targets=(idsRaw||'').split(',').map(s=>s.trim()).filter(Boolean);
 const rl=readline.createInterface({input:stdin,output:stdout});
 try{
  const result=await collect({targets,port:Number(portRaw),password:process.env.FBS_TEACHER_PASSWORD,
   confirmConsent:async id=>{const a=await rl.question(`On student ${id}, grant NEW screen consent; type CONSENT: `);if(a.trim()!=='CONSENT')throw Error('consent not confirmed');},
   confirmStop:async id=>{const a=await rl.question(`On student ${id}, press Stop Sharing; type STOP: `);if(a.trim()!=='STOP')throw Error('stop not confirmed');}});
  fs.writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
 }finally{rl.close();}
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error('M90 audit failed:',e.message);process.exitCode=1;});
module.exports={evaluate,collect};
