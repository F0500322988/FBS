'use strict';
// M63: explicit two-PC observation evidence. No automatic authorization of live input.
const fs=require('node:fs');
const path=require('node:path');
const REQUIRED=['device-discovery','student-consent','screen-preview','visible-indicator','student-stop','network-disconnect','reconnect-requires-consent'];
const ROLES=['Teacher','Student'];
function validateReport(data,role){
 const problems=[];
 if(!data||typeof data!=='object'||Array.isArray(data))return {valid:false,problems:['report must be an object'],checks:[]};
 if(data.stage!=='M63')problems.push('stage must be M63');
 if(data.role!==role)problems.push('role must be '+role);
 if(!Array.isArray(data.observations))problems.push('observations must be an array');
 const observations=Array.isArray(data.observations)?data.observations:[];
 const seen=new Set();const checks=[];
 for(const entry of observations){
  if(!entry||typeof entry!=='object'||!REQUIRED.includes(entry.id)){problems.push('unknown observation id');continue;}
  if(seen.has(entry.id)){problems.push('duplicate observation '+entry.id);continue;}seen.add(entry.id);
  if(!['PASS','FAIL','NOT_TESTED'].includes(entry.status))problems.push('invalid status for '+entry.id);
  if(typeof entry.note!=='string'||entry.note.trim().length<8||entry.note.length>500)problems.push('note must be 8-500 characters for '+entry.id);
  checks.push({id:entry.id,status:entry.status});
 }
 for(const id of REQUIRED)if(!seen.has(id))problems.push('missing observation '+id);
 return {valid:problems.length===0,problems,checks};
}
function summarize(teacher,student){
 const t=validateReport(teacher,'Teacher'),s=validateReport(student,'Student');
 const all=[...t.checks,...s.checks];
 const fieldTestsCompleted=t.valid&&s.valid&&all.length===REQUIRED.length*2&&all.every(x=>x.status==='PASS');
 return {stage:'M63',reportsValid:t.valid&&s.valid,fieldTestsCompleted,readyForLiveInput:false,liveInputEnabled:false,roles:{Teacher:{valid:t.valid,problems:t.problems,passed:t.checks.filter(x=>x.status==='PASS').length},Student:{valid:s.valid,problems:s.problems,passed:s.checks.filter(x=>x.status==='PASS').length}},requiredChecksPerRole:REQUIRED.length,disclaimer:'Manual observations are not proof of native input safety or production readiness.'};
}
function template(role){if(!ROLES.includes(role))throw Error('Invalid role');return {stage:'M63',role,observations:REQUIRED.map(id=>({id,status:'NOT_TESTED',note:'Not tested on two physical Windows computers'}))};}
function main(args){const [command,...rest]=args;
 if(command==='template'){
  const [role,out]=rest;if(!ROLES.includes(role)||!out)throw Error('Usage: template Teacher|Student output.json');
  if(fs.existsSync(out))throw Error('Output exists; refusing overwrite');
  fs.writeFileSync(out,JSON.stringify(template(role),null,2)+'\n',{flag:'wx'});console.log('Template created: '+out);return;
 }
 if(command==='verify'){
  const [teacherPath,studentPath,out]=rest;if(!teacherPath||!studentPath)throw Error('Usage: verify teacher.json student.json [summary.json]');
  const result=summarize(JSON.parse(fs.readFileSync(teacherPath,'utf8')),JSON.parse(fs.readFileSync(studentPath,'utf8')));
  if(out)fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(!result.fieldTestsCompleted)process.exitCode=1;return;
 }
 throw Error('Usage: node windows/M63-Field-Evidence.js template Teacher|Student output.json OR verify teacher.json student.json [summary.json]');
}
if(require.main===module){try{main(process.argv.slice(2))}catch(err){console.error(err.message);process.exitCode=1}}
module.exports={REQUIRED,validateReport,summarize,template};
