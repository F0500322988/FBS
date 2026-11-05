'use strict';
// Human-recorded observations; never sends commands or enables native input.
const fs=require('node:fs');
const path=require('node:path');
const {evaluate}=require('./M67-Field-Readiness');
const STEPS=[
 ['disconnected-preview-denied','Teacher'],
 ['student-connected','Student'],
 ['preview-before-consent-denied','Teacher'],
 ['student-explicit-consent','Student'],
 ['preview-visible','Teacher'],
 ['sharing-indicator-visible','Student'],
 ['student-pressed-stop','Student'],
 ['preview-stopped','Teacher'],
 ['preview-after-stop-denied','Teacher'],
 ['student-reconnected','Student'],
 ['preview-before-new-consent-denied','Teacher'],
 ['student-new-consent','Student'],
 ['preview-resumed','Teacher'],
 ['network-disconnected','Student'],
 ['preview-after-disconnect-denied','Teacher']
];
function template(){return {stage:'M68',environment:'two-physical-Windows-11-PCs',sessionId:'',steps:STEPS.map(([id,role])=>({id,role,status:'NOT_TESTED',note:'',observedAt:''}))};}
function verify(evidence,review){
 const problems=[];
 if(!evidence||typeof evidence!=='object'||Array.isArray(evidence))return {stage:'M68',passed:false,problems:['invalid evidence'],liveInputEnabled:false};
 if(evidence.stage!=='M68'||evidence.environment!=='two-physical-Windows-11-PCs')problems.push('wrong stage or environment');
 if(typeof evidence.sessionId!=='string'||!/^[a-zA-Z0-9_-]{8,64}$/.test(evidence.sessionId))problems.push('sessionId must be 8-64 safe characters');
 if(!Array.isArray(evidence.steps)||evidence.steps.length!==STEPS.length)problems.push('incorrect number of steps');
 let lastTime=-Infinity;
 for(let i=0;i<STEPS.length;i++){
  const item=Array.isArray(evidence.steps)?evidence.steps[i]:undefined;
  const [id,role]=STEPS[i];
  if(!item||item.id!==id||item.role!==role){problems.push('missing/out-of-order step '+id);continue;}
  if(item.status!=='PASS')problems.push('step not PASS: '+id);
  if(typeof item.note!=='string'||item.note.trim().length<8||item.note.length>500)problems.push('note length invalid: '+id);
  if(typeof item.observedAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(item.observedAt)||!Number.isFinite(Date.parse(item.observedAt))){problems.push('invalid timestamp: '+id);continue;}
  const time=Date.parse(item.observedAt);
  if(time<=lastTime)problems.push('timestamps not strictly increasing: '+id);
  lastTime=time;
 }
 if(!review||review.stage!=='M67'||review.reviewPassed!==true||review.liveInputEnabled!==false||review.readyForLiveInput!==false)problems.push('M67 review not passed or unsafe');
 return {stage:'M68',passed:problems.length===0,liveInputEnabled:false,readyForLiveInput:false,physicalTestSelfReported:true,problems,disclaimer:'This validates user-entered evidence only; no independent verification of devices or authorization for native input.'};
}
function main(args){
 const [cmd,...rest]=args;
 if(cmd==='template'&&rest.length===1){const out=rest[0];fs.writeFileSync(out,JSON.stringify(template(),null,2)+'\n',{flag:'wx'});console.log('Created '+out);return;}
 if(cmd==='verify'&&rest.length===3){const [ev,rev,out]=rest;if([ev,rev].some(p=>path.resolve(p)===path.resolve(out)))throw Error('Refusing to overwrite input');const result=verify(JSON.parse(fs.readFileSync(ev,'utf8')),JSON.parse(fs.readFileSync(rev,'utf8')));fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;return;}
 throw Error('Usage: node windows/M68-Live-Session-Evidence.js template evidence.json | verify evidence.json m67-review.json m68-result.json');
}
if(require.main===module)try{main(process.argv.slice(2))}catch(e){console.error('M68: '+e.message);process.exitCode=1;}
module.exports={STEPS,template,verify};
