'use strict';
// Fail-closed review of M63 field evidence and M64 native input isolation.
// This tool does NOT authorize, enable, or execute remote input.
const fs = require('node:fs');
const path = require('node:path');
const {summarize} = require('./M63-Field-Evidence');
const root = path.resolve(__dirname, '..');
function sourceSafety(source) {
  const checks = [
    {id:'native-adapter-default-disabled',passed:/private\s+bool\s+enabled\s*;/.test(source) && !/private\s+bool\s+enabled\s*=\s*true/.test(source)},
    {id:'native-adapter-enable-fail-closed',passed:/EnableForVerifiedSession\s*\(\s*bool\s+explicitlyEnabledByOperator\s*\)\s*=>\s*enabled\s*=\s*false\s*;/.test(source)},
    {id:'native-adapter-explicit-disable',passed:/void\s+Disable\s*\(\s*\)\s*=>\s*enabled\s*=\s*false\s*;/.test(source)},
    {id:'pointer-guard',passed:/bool\s+MovePointer\s*\([^)]*\)\s*\{\s*if\s*\(\s*!enabled\s*\)\s*return\s+false\s*;/.test(source)},
    {id:'keyboard-guard',passed:/bool\s+TapLetter\s*\([^)]*\)\s*\{\s*if\s*\(\s*!enabled\s*\|\|/.test(source)}
  ];
  return {passed:checks.every(c=>c.passed),checks};
}
function assess(teacher,student,source){
 const evidence = summarize(teacher,student);
 const native = sourceSafety(source);
 return {stage:'M64',fieldEvidenceComplete:evidence.fieldTestsCompleted,nativeInputIsolationPassed:native.passed,reviewPassed:evidence.fieldTestsCompleted&&native.passed,readyForLiveInput:false,liveInputEnabled:false,fieldEvidence:evidence,nativeChecks:native.checks,notice:'Manual evidence and source inspection are not a substitute for a real Windows build, runtime safety test, or independent security review. Remote input remains disabled.'};
}
function main(args){
 if(args.length!==3)throw Error('Usage: node windows/M64-Safety-Gate.js teacher.json student.json m64-review.json');
 const [t,s,out]=args;
 if(path.resolve(out)===path.resolve(t)||path.resolve(out)===path.resolve(s))throw Error('Output must not overwrite input evidence');
 const teacher=JSON.parse(fs.readFileSync(t,'utf8'));
 const student=JSON.parse(fs.readFileSync(s,'utf8'));
 const source=fs.readFileSync(path.join(root,'windows','FBS.Student.Native','WindowsInputAdapter.cs'),'utf8');
 const result=assess(teacher,student,source);
 fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({stage:result.stage,reviewPassed:result.reviewPassed,fieldEvidenceComplete:result.fieldEvidenceComplete,nativeInputIsolationPassed:result.nativeInputIsolationPassed,readyForLiveInput:false,report:out},null,2));
 if(!result.reviewPassed)process.exitCode=1;
}
if(require.main===module){try{main(process.argv.slice(2))}catch(err){console.error('M64 review failed: '+err.message);process.exitCode=1}}
module.exports={sourceSafety,assess};
