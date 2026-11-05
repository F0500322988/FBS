'use strict';
// Records manual observations only. Never operates remote input or screen capture.
const fs=require('node:fs');
const path=require('node:path');
const SCENARIOS=[
 ['student-stop','student pressed Stop; teacher preview ceased'],
 ['teacher-end','teacher ended session; student sharing indicator cleared'],
 ['network-loss','network disconnected; teacher preview ceased'],
 ['reconnect-no-consent','network restored; preview remained denied until new consent']
];
function template(){return {stage:'M70',environment:'two-physical-Windows-11-PCs',sessionId:'',observations:SCENARIOS.map(([id,description])=>({id,description,status:'NOT_TESTED',triggerAt:'',confirmedAt:'',studentNote:'',teacherNote:''}))};}
function validTime(s){return typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(s)&&Number.isFinite(Date.parse(s));}
function evaluate(evidence,prior){const issues=[];const measured=[];
 if(!prior||prior.stage!=='M69'||prior.passed!==true||prior.liveInputEnabled!==false||prior.readyForLiveInput!==false||prior.approvedForLiveInput!==false)issues.push('M69 review missing, failed, or unsafe');
 if(!evidence||typeof evidence!=='object'||Array.isArray(evidence))return {stage:'M70',passed:false,issues:['Invalid evidence',...issues],liveInputEnabled:false,readyForLiveInput:false};
 if(evidence.stage!=='M70'||evidence.environment!=='two-physical-Windows-11-PCs')issues.push('Incorrect stage/environment');
 if(typeof evidence.sessionId!=='string'||!/^[A-Za-z0-9_-]{8,64}$/.test(evidence.sessionId))issues.push('Invalid session ID');
 if(!Array.isArray(evidence.observations)||evidence.observations.length!==SCENARIOS.length)issues.push('Incorrect observation count');
 let previous=-Infinity;
 SCENARIOS.forEach(([id,description],i)=>{const o=Array.isArray(evidence.observations)?evidence.observations[i]:null;
  if(!o||o.id!==id||o.description!==description){issues.push('Missing or reordered scenario: '+id);return;}
  if(o.status!=='PASS')issues.push('Scenario not PASS: '+id);
  for(const field of ['studentNote','teacherNote'])if(typeof o[field]!=='string'||o[field].trim().length<8||o[field].length>500)issues.push('Invalid '+field+': '+id);
  if(!validTime(o.triggerAt)||!validTime(o.confirmedAt)){issues.push('Invalid timestamps: '+id);return;}
  const start=Date.parse(o.triggerAt),end=Date.parse(o.confirmedAt),elapsed=end-start;
  if(start<=previous)issues.push('Scenarios out of chronological order: '+id);
  previous=end;
  if(elapsed<0||elapsed>30000)issues.push('Invalid or excessive observed interval: '+id);
  measured.push({id,observedMilliseconds:elapsed});
 });
 return {stage:'M70',passed:issues.length===0,scope:'one-student-preview-only',selfReported:true,observedIntervals:measured,issues,liveInputEnabled:false,readyForLiveInput:false,approvedForLiveInput:false,notice:'Human-entered timestamps are not instrumented latency measurements or proof of immediate stop. This report does not enable native input.'};
}
function main(args){const [cmd,...rest]=args;
 if(cmd==='template'&&rest.length===1){fs.writeFileSync(rest[0],JSON.stringify(template(),null,2)+'\n',{flag:'wx'});console.log('Created '+rest[0]);return;}
 if(cmd==='verify'&&rest.length===3){const [e,p,out]=rest;if([e,p].some(f=>path.resolve(f)===path.resolve(out)))throw Error('Output must differ from input');const result=evaluate(JSON.parse(fs.readFileSync(e)),JSON.parse(fs.readFileSync(p)));fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({passed:result.passed,issues:result.issues,output:out},null,2));if(!result.passed)process.exitCode=1;return;}
 throw Error('Usage: node windows/M70-Stop-Response-Evidence.js template m70-evidence.json | verify m70-evidence.json m69-report.json m70-result.json');
}
if(require.main===module)try{main(process.argv.slice(2))}catch(e){console.error('M70: '+e.message);process.exitCode=1;}
module.exports={SCENARIOS,template,evaluate};
