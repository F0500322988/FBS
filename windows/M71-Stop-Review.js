'use strict';
// Fail-closed review of manually observed stop/reconnect evidence. Does not enable remote input.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {evaluate}=require('./M70-Stop-Response-Evidence');
const SOURCE=path.join(__dirname,'FBS.Student.Native','WindowsInputAdapter.cs');
function review(evidence,prior,submitted,source){
 const calculated=evaluate(evidence,prior);
 const issues=[...calculated.issues];
 if(!calculated.passed)issues.push('M70 evidence verification failed');
 if(!submitted||submitted.stage!=='M70'||submitted.passed!==true||submitted.selfReported!==true||submitted.liveInputEnabled!==false||submitted.readyForLiveInput!==false||submitted.approvedForLiveInput!==false)issues.push('M70 submitted result missing or unsafe');
 if(JSON.stringify(submitted?.observedIntervals)!==JSON.stringify(calculated.observedIntervals))issues.push('M70 observed intervals do not match source evidence');
 if(submitted?.scope!=='one-student-preview-only'||!Array.isArray(submitted?.issues)||submitted.issues.length)issues.push('M70 submitted scope or issues invalid');
 if(typeof source!=='string'||!source.includes('class WindowsInputAdapter')||!source.includes('Disable()'))issues.push('Native adapter safety markers absent');
 // Require the actual adapter to remain disabled: no remote input activation in this stage.
 if(!/EnableForVerifiedSession\s*\(bool\s+explicitlyEnabledByOperator\)\s*=>\s*enabled\s*=\s*false\s*;/.test(source)||!source.includes('SendInput'))issues.push('Native adapter disabled-state review failed');
 return {stage:'M71',passed:issues.length===0,scope:'one-student-preview-only',selfReported:true,
   sourceSha256:crypto.createHash('sha256').update(source||'').digest('hex'),
   observedIntervals:calculated.observedIntervals,issues,
   liveInputEnabled:false,readyForLiveInput:false,approvedForLiveInput:false,
   notice:'Review of user-entered field observations, not an instrumented latency test. Native input remains disabled.'};
}
function main(args){
 if(args.length!==4)throw Error('Usage: node windows/M71-Stop-Review.js m70-evidence.json m69-report.json m70-result.json m71-review.json');
 const [ev,prior,result,out]=args;
 if([ev,prior,result].some(p=>path.resolve(p)===path.resolve(out)))throw Error('Output must differ from inputs');
 const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
 const report=review(read(ev),read(prior),read(result),fs.readFileSync(SOURCE,'utf8'));
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({passed:report.passed,issues:report.issues,output:out},null,2));
 if(!report.passed)process.exitCode=1;
}
if(require.main===module)try{main(process.argv.slice(2))}catch(e){console.error('M71: '+e.message);process.exitCode=1;}
module.exports={review};
