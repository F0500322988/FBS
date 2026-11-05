'use strict';
// Read-only, operator-guided connection recovery test. Does not disconnect devices or enable remote input.
const fs=require('node:fs');
const readline=require('node:readline/promises');
const {stdin,stdout}=require('node:process');
const {collect}=require('./M84-Enrollment-Visibility');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function evaluate(phases,{expected=1}={}){
 const issues=[];
 if(!Number.isInteger(expected)||expected<1||expected>40)issues.push('invalid_expected');
 if(!phases||!['baseline','disconnected','reconnected'].every(k=>Array.isArray(phases[k])&&phases[k].length>=2))issues.push('missing_phase_samples');
 if(issues.length)return {stage:'M102',passed:false,issues,expected,remoteInputEnabled:false};
 const good=s=>s&&s.stage==='M84'&&s.passed===true&&s.expected===expected&&Number.isInteger(s.approvedOnline)&&s.approvedOnline>=expected&&Array.isArray(s.issues)&&s.issues.length===0;
 const safe=s=>s&&s.stage==='M84'&&s.expected===expected&&Array.isArray(s.issues)&&Number.isInteger(s.approvedOnline)&&s.approvedOnline>=0&&!s.issues.includes('remote_input_not_disabled');
 const baseline=phases.baseline.every(good);
 const outage=phases.disconnected.every(s=>safe(s)&&s.approvedOnline<expected&&s.passed===false);
 const recovery=phases.reconnected.every(good);
 if(!baseline)issues.push('baseline_not_healthy');
 if(!outage)issues.push('disconnect_not_observed');
 if(!recovery)issues.push('recovery_not_stable');
 return {stage:'M102',passed:issues.length===0,issues,expected,phases:{baseline:{samples:phases.baseline.length,healthy:baseline},disconnected:{samples:phases.disconnected.length,outageObserved:outage},reconnected:{samples:phases.reconnected.length,healthy:recovery}},remoteInputEnabled:false,limitations:'Aggregate read-only teacher API snapshots; no physical student identity or visual UI verification. Operator must disconnect/reconnect the test student. No automatic network changes.'};
}
async function capture(expected,port,count,intervalMs,password){
 const results=[];
 for(let i=0;i<count;i++){
  if(i)await sleep(intervalMs);
  try{results.push(await collect({expected,port,password}));}
  catch(e){results.push({stage:'M84',passed:false,expected,approvedOnline:null,issues:['teacher_api_unavailable']});}
 }
 return results;
}
async function main(args){
 const [expectedRaw='1',out='m102-recovery.json',countRaw='3',intervalRaw='2000',portRaw='4177']=args;
 const expected=Number(expectedRaw),count=Number(countRaw),intervalMs=Number(intervalRaw),port=Number(portRaw);
 if(!Number.isInteger(expected)||expected<1||expected>40||!Number.isInteger(count)||count<2||count>20||!Number.isInteger(intervalMs)||intervalMs<500||intervalMs>30000||!Number.isInteger(port)||port<1||port>65535)throw Error('invalid_arguments');
 const password=process.env.FBS_TEACHER_PASSWORD;
 if(!password)throw Error('FBS_TEACHER_PASSWORD required');
 const rl=readline.createInterface({input:stdin,output:stdout});
 try{
  console.log('Baseline: keep all expected students connected and approved.');
  const baseline=await capture(expected,port,count,intervalMs,password);
  if(!baseline.every(s=>s.passed===true)){throw Error('baseline_failed; no disconnect requested');}
  const a=await rl.question('Disconnect ONE test student (do not stop teacher service), then type DISCONNECT: ');
  if(a.trim()!=='DISCONNECT')throw Error('operator_cancelled');
  const disconnected=await capture(expected,port,count,intervalMs,password);
  if(!disconnected.every(s=>s.approvedOnline!==null&&s.approvedOnline<expected)){throw Error('disconnect_not_observed; reconnect test student before retry');}
  const b=await rl.question('Reconnect the same student, confirm approval, then type RECONNECT: ');
  if(b.trim()!=='RECONNECT')throw Error('operator_cancelled');
  const reconnected=await capture(expected,port,count,intervalMs,password);
  const report=evaluate({baseline,disconnected,reconnected},{expected});
  fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify(report,null,2));
  if(!report.passed)process.exitCode=1;
 }finally{rl.close();}
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error('M102 failed:',e.message);process.exitCode=1;});
module.exports={evaluate,capture};
