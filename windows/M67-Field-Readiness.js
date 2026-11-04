'use strict';
// M67: correlate per-device automated preflight and independently recorded manual evidence.
// This is a review tool, not a native-input enablement mechanism.
const fs=require('node:fs');
const path=require('node:path');
const {summarize}=require('./M63-Field-Evidence');
const {review}=require('./M66-Single-Student-Gate');
const REQUIRED_AUTO=['teacher-http-smoke','m61-network-and-integrity'];
function assessPreflight(report,role){
 const problems=[];
 if(!report||typeof report!=='object'||Array.isArray(report))return {passed:false,problems:['invalid preflight report']};
 if(report.stage!=='M62'||report.role!==role)problems.push('wrong stage or role');
 if(report.automatedChecksPassed!==true)problems.push('automated preflight did not pass');
 if(report.readyForLiveInput!==false)problems.push('unexpected live-input readiness');
 if(!Array.isArray(report.checks))problems.push('checks missing');
 const checks=Array.isArray(report.checks)?report.checks:[];
 for(const name of REQUIRED_AUTO){
  const matches=checks.filter(c=>c&&c.name===name);
  if(matches.length!==1||matches[0].status!=='PASS')problems.push('required check not PASS exactly once: '+name);
 }
 if(checks.some(c=>c&&c.status==='FAIL'))problems.push('preflight includes failed check');
 return {passed:problems.length===0,problems};
}
function evaluate(teacherPreflight,studentPreflight,teacherEvidence,studentEvidence,source){
 const t=assessPreflight(teacherPreflight,'Teacher');
 const s=assessPreflight(studentPreflight,'Student');
 const field=summarize(teacherEvidence,studentEvidence);
 const safety=review({teacher:teacherEvidence,student:studentEvidence,...(source===undefined?{}:{source})});
 const problems=[...t.problems.map(x=>'teacher: '+x),...s.problems.map(x=>'student: '+x)];
 if(!field.fieldTestsCompleted)problems.push('manual two-PC observations incomplete or failed');
 if(!safety.passed)problems.push('M66 simulation/source gate failed');
 return {stage:'M67',preflight:{Teacher:t,Student:s},fieldTestsCompleted:field.fieldTestsCompleted,
  simulationPassed:safety.passed,reviewPassed:problems.length===0,readyForLiveInput:false,
  liveInputEnabled:false,requiresHumanFieldReview:true,problems,
  notice:'Review passed only when supplied reports indicate PASS. This tool cannot independently verify physical tests or authorize real remote input.'};
}
function main(args){
 if(args.length!==5)throw Error('Usage: node windows/M67-Field-Readiness.js teacher-m62.json student-m62.json teacher-m63.json student-m63.json output.json');
 const [tp,sp,te,se,out]=args;
 if(args.slice(0,4).some(p=>path.resolve(p)===path.resolve(out)))throw Error('Refusing to overwrite input evidence');
 if(fs.existsSync(out))throw Error('Output exists; refusing overwrite');
 const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
 const result=evaluate(read(tp),read(sp),read(te),read(se));
 fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({stage:result.stage,reviewPassed:result.reviewPassed,readyForLiveInput:false,problems:result.problems,report:out},null,2));
 if(!result.reviewPassed)process.exitCode=1;
}
if(require.main===module){try{main(process.argv.slice(2))}catch(e){console.error('M67 review failed: '+e.message);process.exitCode=1;}}
module.exports={REQUIRED_AUTO,assessPreflight,evaluate};
