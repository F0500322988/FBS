'use strict';
// M72: fail-closed validator for one-student preview-only session traces.
// This tool never sends input or authorizes enabling native input.
const fs = require('node:fs');
const path = require('node:path');
const EVENTS = new Set(['connect','consent','preview-start','preview-stop','student-stop','teacher-stop','disconnect','reconnect','timeout','input-attempt']);
function validate(trace, previousReview) {
  const issues=[];
  if (!previousReview || previousReview.stage!=='M71' || previousReview.passed!==true || previousReview.liveInputEnabled!==false || previousReview.readyForLiveInput!==false || previousReview.approvedForLiveInput!==false) issues.push('M71 review not approved for preview-only validation');
  if (!trace || trace.stage!=='M72' || trace.scope!=='one-student-preview-only' || !Array.isArray(trace.events) || trace.events.length<2 || trace.events.length>500) issues.push('Invalid trace envelope');
  let connected=false, consent=false, preview=false, stopped=false, last=-1, sawStop=false;
  const events=Array.isArray(trace?.events)?trace.events.slice(0,500):[];
  events.forEach((entry,i)=>{
    if (!entry || !EVENTS.has(entry.type) || !Number.isSafeInteger(entry.atMs) || entry.atMs<0 || entry.atMs<=last) {issues.push(`event ${i}: invalid type or timestamp`);return;}
    last=entry.atMs;
    if (entry.studentId!==trace.studentId || typeof entry.studentId!=='string' || !entry.studentId.trim()) issues.push(`event ${i}: student identity mismatch`);
    if (entry.type==='connect') { if(connected)issues.push(`event ${i}: duplicate connect`); connected=true;consent=false;preview=false;stopped=false; }
    if (entry.type==='reconnect') {if(connected)issues.push(`event ${i}: reconnect while connected`);connected=true;consent=false;preview=false;stopped=false;}
    if (entry.type==='consent') {if(!connected||stopped)issues.push(`event ${i}: consent without active connection`);else consent=true;}
    if (entry.type==='preview-start') {if(!connected||!consent||stopped||preview)issues.push(`event ${i}: unauthorized preview`);else preview=true;}
    if (entry.type==='preview-stop') {if(!preview)issues.push(`event ${i}: no preview to stop`);preview=false;}
    if (['student-stop','teacher-stop','disconnect','timeout'].includes(entry.type)) {preview=false;consent=false;stopped=true;sawStop=true;if(entry.type==='disconnect'||entry.type==='timeout')connected=false;}
    if (entry.type==='input-attempt') issues.push(`event ${i}: native input attempt forbidden in M72`);
    if (entry.liveInputEnabled!==false) issues.push(`event ${i}: live input must remain disabled`);
  });
  if (!sawStop)issues.push('No stop/revocation event recorded');
  if (preview||consent)issues.push('Session ends with active preview or consent');
  if (typeof trace?.studentId!=='string'||!trace.studentId.trim())issues.push('Missing student ID');
  return {stage:'M72',passed:issues.length===0,scope:'one-student-preview-only',simulationOnly:false,selfReported:true,liveInputEnabled:false,readyForLiveInput:false,approvedForLiveInput:false,eventCount:events.length,issues,notice:'Validates user-recorded events only; does not independently measure Windows behavior or authorize remote input.'};
}
function template(){return {stage:'M72',scope:'one-student-preview-only',studentId:'STUDENT-01',events:[{type:'connect',atMs:1000,studentId:'STUDENT-01',liveInputEnabled:false},{type:'consent',atMs:2000,studentId:'STUDENT-01',liveInputEnabled:false},{type:'preview-start',atMs:3000,studentId:'STUDENT-01',liveInputEnabled:false},{type:'student-stop',atMs:4000,studentId:'STUDENT-01',liveInputEnabled:false}]};}
function main(args){const [cmd,a,b,c]=args;if(cmd==='template'&&a&&!b){fs.writeFileSync(a,JSON.stringify(template(),null,2)+'\n',{flag:'wx'});return;}
 if(cmd!=='verify'||!a||!b||!c||args.length!==4)throw Error('Usage: template trace.json OR verify trace.json m71-review.json m72-report.json');
 if([a,b].some(p=>path.resolve(p)===path.resolve(c)))throw Error('Output must not overwrite inputs');
 const result=validate(JSON.parse(fs.readFileSync(a,'utf8')),JSON.parse(fs.readFileSync(b,'utf8')));
 fs.writeFileSync(c,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({passed:result.passed,issues:result.issues,report:c}));if(!result.passed)process.exitCode=1;
}
if(require.main===module)try{main(process.argv.slice(2))}catch(e){console.error('M72: '+e.message);process.exitCode=1;}
module.exports={validate,template};
