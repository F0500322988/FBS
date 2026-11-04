#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
function verify(report){
 if(!report||report.stage!=='M59'||report.passed!==true||report.liveInputEnabled!==false) return {ready:false,reason:'invalid-or-incomplete-report'};
 const expected={Student:'FBS.Student.Native.exe',Teacher:'FBS.Teacher.exe'};
 if(!Array.isArray(report.checks)||report.checks.length!==5||report.checks.some(x=>x.passed!==true)) return {ready:false,reason:'checks-incomplete'};
 if(!Array.isArray(report.artifacts)||report.artifacts.length!==2) return {ready:false,reason:'artifacts-incomplete'};
 const roles=new Set();
 for(const a of report.artifacts){
  if(!a||!Object.hasOwn(expected,a.role)||a.name!==expected[a.role]||roles.has(a.role)||!Number.isSafeInteger(a.sizeBytes)||a.sizeBytes<1024||typeof a.sha256!=='string'||!/^[a-f0-9]{64}$/.test(a.sha256)) return {ready:false,reason:'invalid-artifact'};
  roles.add(a.role);
 }
 return {ready:true,reason:'metadata-valid-not-runtime-verified'};
}
if(require.main===module){try{const result=verify(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))); console.log(JSON.stringify(result,null,2)); process.exitCode=result.ready?0:1}catch(e){console.error(e.message);process.exitCode=1}}
module.exports={verify};
