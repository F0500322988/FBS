'use strict';
// M66: deterministic one-student safety matrix. Does not perform native input.
const fs = require('node:fs');
const path = require('node:path');
const {rehearse,SCENARIOS} = require('./M65-Session-Rehearsal');
const {sourceSafety,assess} = require('./M64-Safety-Gate');
const {template} = require('./M63-Field-Evidence');
const adapter = path.join(__dirname,'FBS.Student.Native','WindowsInputAdapter.cs');
const CASES = Object.freeze({
  'no-consent': ['connect','preview','input'],
  'consent-preview-stop': SCENARIOS['consent-preview-stop'],
  'disconnect-reconsent': SCENARIOS['disconnect-reconsent'],
  'timeout': SCENARIOS.timeout,
  'input-blocked': SCENARIOS['input-blocked'],
  'stop-before-consent': ['connect','stop','consent','preview','input'],
  'stop-after-reconnect': ['connect','consent','preview','stop','reconnect','preview','input'],
  'disconnect-while-stopped': ['connect','consent','preview','stop','disconnect','reconnect','preview','input']
});
function evaluateTrace(events, trace) {
  const failures=[];
  let previous=null;
  for(let i=0;i<trace.length;i++) {
    const t=trace[i];
    if(t.liveInputEnabled!==false) failures.push(`step ${i}: input flag enabled`);
    if(t.preview && (!t.connected||!t.consent)) failures.push(`step ${i}: preview without consent and connection`);
    if(t.event==='input'&&t.accepted) failures.push(`step ${i}: remote input accepted`);
    if(['stop','disconnect','timeout'].includes(t.event) && (t.preview||t.consent)) failures.push(`step ${i}: revoke failed`);
    if(t.event==='reconnect' && (t.preview||t.consent)) failures.push(`step ${i}: reconnect reused consent`);
    if(t.event==='preview'&&t.accepted && (!previous||!previous.consent)) failures.push(`step ${i}: preview accepted without prior consent`);
    previous=t;
  }
  if(trace.length!==events.length) failures.push('trace length mismatch');
  return failures;
}
function review({teacher,student,source}={}) {
  const native=sourceSafety(source===undefined?fs.readFileSync(adapter,'utf8'):source);
  const cases=Object.entries(CASES).map(([name,events])=>{
    const result=rehearse(events);
    const failures=evaluateTrace(events,result.trace);
    if(!result.passed||result.liveInputEnabled!==false)failures.push('rehearsal failed');
    return {name,passed:failures.length===0,steps:events.length,failures};
  });
  const evidenceProvided=teacher!==undefined||student!==undefined;
  const evidence=evidenceProvided ? (teacher&&student?assess(teacher,student,source===undefined?fs.readFileSync(adapter,'utf8'):source):null) : null;
  const failures=[];
  if(!native.passed)failures.push('native input adapter isolation failed');
  if(cases.some(c=>!c.passed))failures.push('one or more simulation scenarios failed');
  if(evidenceProvided && (!evidence||!evidence.reviewPassed))failures.push('field evidence incomplete or failed');
  return {stage:'M66',simulationOnly:true,liveInputEnabled:false,readyForLiveInput:false,
    nativeInputIsolationPassed:native.passed,scenarioCount:cases.length,cases,
    evidenceProvided,fieldSafetyReviewPassed:evidenceProvided?Boolean(evidence&&evidence.reviewPassed):null,
    passed:failures.length===0,failures,
    notice:'PASS means deterministic simulation and static source checks only. It is not authorization for native input or proof of a Windows field test.'};
}
function main(args){
  if(args.length!==1&&args.length!==3)throw Error('Usage: node windows/M66-Single-Student-Gate.js output.json [teacher.json student.json]');
  const [out,t,s]=args;
  if([t,s].filter(Boolean).some(p=>path.resolve(p)===path.resolve(out)))throw Error('Output cannot overwrite evidence');
  const result=review(args.length===3?{teacher:JSON.parse(fs.readFileSync(t,'utf8')),student:JSON.parse(fs.readFileSync(s,'utf8'))}:{});
  fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({stage:'M66',passed:result.passed,scenarioCount:result.scenarioCount,simulationOnly:true,liveInputEnabled:false,report:out},null,2));
  if(!result.passed)process.exitCode=1;
}
if(require.main===module){try{main(process.argv.slice(2))}catch(err){console.error('M66 gate failed: '+err.message);process.exitCode=1;}}
module.exports={CASES,evaluateTrace,review};
