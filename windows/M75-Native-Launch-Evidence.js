'use strict';
// Human-attested field evidence: no automatic claim of a Windows launch.
const fs = require('node:fs');
const path = require('node:path');
const roles = ['Teacher', 'Student'];
const checks = ['exeStarted', 'windowVisible', 'expectedRuntimeAvailable', 'noUnexpectedCrash', 'studentStopAvailable'];
function template(role) {
 if (!roles.includes(role)) throw Error('Role must be Teacher or Student');
 return {stage:'M75',role,deviceId:'',observedAt:'',checks:Object.fromEntries(checks.filter(x=>role==='Student'||x!=='studentStopAvailable').map(x=>[x,'NOT_TESTED'])),notes:''};
}
function validate(evidence) {
 const issues=[];
 if (!evidence||evidence.stage!=='M75'||!roles.includes(evidence.role)) return {passed:false,issues:['Invalid M75 evidence or role']};
 if (typeof evidence.deviceId!=='string'||!evidence.deviceId.trim()) issues.push('Missing deviceId');
 if (typeof evidence.observedAt!=='string'||!Number.isFinite(Date.parse(evidence.observedAt))) issues.push('Missing or invalid observedAt');
 const expected=checks.filter(x=>evidence.role==='Student'||x!=='studentStopAvailable');
 if (!evidence.checks||typeof evidence.checks!=='object'||Array.isArray(evidence.checks)) issues.push('Missing checks');
 else {
  for(const key of expected) if(evidence.checks[key]!=='PASS') issues.push(`${key}: not PASS`);
  for(const key of Object.keys(evidence.checks)) if(!expected.includes(key)) issues.push(`Unknown check: ${key}`);
 }
 return {passed:issues.length===0,issues};
}
function review(teacher,student){
 const t=validate(teacher),s=validate(student),issues=[...t.issues.map(x=>'Teacher: '+x),...s.issues.map(x=>'Student: '+x)];
 if(teacher?.role!=='Teacher'||student?.role!=='Student')issues.push('Reports must be Teacher then Student');
 if(teacher?.deviceId&&teacher.deviceId===student?.deviceId)issues.push('Teacher and Student device IDs must differ');
 return {stage:'M75',scope:'human-attested-native-launch',passed:issues.length===0,realWindowsTestedByTool:false,liveInputEnabled:false,approvedForLiveInput:false,issues};
}
function writeNew(file,data){fs.writeFileSync(path.resolve(file),JSON.stringify(data,null,2)+'\n',{flag:'wx'});}
function main(args){
 if(args[0]==='template'&&args.length===3){writeNew(args[2],template(args[1]));return;}
 if(args[0]==='verify'&&args.length===4){const t=JSON.parse(fs.readFileSync(args[1],'utf8')),s=JSON.parse(fs.readFileSync(args[2],'utf8'));const result=review(t,s);writeNew(args[3],result);console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;return;}
 throw Error('Usage: template Teacher|Student output.json OR verify teacher.json student.json report.json');
}
if(require.main===module)try{main(process.argv.slice(2))}catch(e){console.error('M75: '+e.message);process.exitCode=1;}
module.exports={template,validate,review};
