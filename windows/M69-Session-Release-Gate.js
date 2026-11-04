'use strict';
// A conservative readiness review, not a switch for native keyboard/mouse input.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {verify}=require('./M68-Live-Session-Evidence');
const {review}=require('./M66-Single-Student-Gate');
const adapterPath=path.join(__dirname,'FBS.Student.Native','WindowsInputAdapter.cs');
function evaluate(evidence,m67,adapterSource){
 const m68=verify(evidence,m67);
 const native=review({source:adapterSource});
 const issues=[];
 if(!m68.passed)issues.push(...m68.problems.map(p=>'M68: '+p));
 if(!native.passed||!native.nativeInputIsolationPassed)issues.push('Native input isolation or simulation failed');
 if(native.cases.some(c=>!c.passed))issues.push('At least one native safety rehearsal failed');
 // This report intentionally never approves live input, even with all green checks.
 return {stage:'M69',passed:issues.length===0,scope:'one-student-preview-only',
   m68EvidenceValid:m68.passed,physicalTestSelfReported:true,
   nativeInputIsolationPassed:native.nativeInputIsolationPassed,
   simulationCases:native.scenarioCount,
   sourceSha256:crypto.createHash('sha256').update(adapterSource).digest('hex'),
   liveInputEnabled:false,readyForLiveInput:false,approvedForLiveInput:false,
   issues,notice:'Evidence is self-reported; this review neither executes nor authorizes remote keyboard/mouse input.'};
}
function main(args){
 if(args.length!==3)throw Error('Usage: node windows/M69-Session-Release-Gate.js m68-evidence.json m67-review.json m69-report.json');
 const [ev,prior,out]=args;
 if([ev,prior].some(p=>path.resolve(p)===path.resolve(out)))throw Error('Refusing to overwrite an input file');
 const result=evaluate(JSON.parse(fs.readFileSync(ev,'utf8')),JSON.parse(fs.readFileSync(prior,'utf8')),fs.readFileSync(adapterPath,'utf8'));
 fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({stage:result.stage,passed:result.passed,issues:result.issues,report:out,liveInputEnabled:false},null,2));
 if(!result.passed)process.exitCode=1;
}
if(require.main===module)try{main(process.argv.slice(2))}catch(err){console.error('M69: '+err.message);process.exitCode=1;}
module.exports={evaluate};
