'use strict';
// Offline inspection only: does not execute EXEs or authorize remote input.
const fs=require('node:fs');
const path=require('node:path');
const {verify}=require('./Verify-M60-Runtime');
const {createHash}=require('node:crypto');
const required=['Teacher/FBS.Teacher.exe','Student/FBS.Student.Native.exe','Runtime/node.exe','Runtime/server.js','Runtime/student-agent.js','Runtime/Start-Student-Agent.ps1'];
function inspect(root){
 const resolved=path.resolve(root);
 const baseline=verify(resolved);
 const checks=required.map(relative=>{
  const target=path.join(resolved,relative);let sizeBytes=0,sha256=null,passed=false;
  try{const stat=fs.statSync(target);if(stat.isFile()&&stat.size>0){sizeBytes=stat.size;sha256=createHash('sha256').update(fs.readFileSync(target)).digest('hex');passed=true;}}catch{}
  return {file:relative,passed,sizeBytes,sha256};
 });
 const issues=[];
 if(!baseline.ok)issues.push('Missing distribution files: '+baseline.missing.join(', '));
 for(const check of checks)if(!check.passed)issues.push('Missing or empty: '+check.file);
 return {stage:'M74',scope:'offline-native-package-preflight',passed:issues.length===0,realWindowsTested:false,executablesLaunched:false,liveInputEnabled:false,approvedForLiveInput:false,checks,issues};
}
function main(args){if(args.length<1||args.length>2)throw Error('Usage: node windows/M74-Native-Preflight.js <dist-m60> [report.json]');const result=inspect(args[0]);if(args[1])fs.writeFileSync(path.resolve(args[1]),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;}
if(require.main===module)try{main(process.argv.slice(2))}catch(e){console.error('M74: '+e.message);process.exitCode=1;}
module.exports={inspect};
