'use strict';
// Offline staged deployment planner. Does not execute installers or touch remote PCs.
const fs=require('node:fs');
const crypto=require('node:crypto');
const {readJson}=require('./M95-Pilot-Rollout');
const CHECKS=['installer_hash_verified','install_launch_verified','lan_tls_verified','consent_stop_verified','uninstall_rollback_verified'];
function evaluate(capacity,m94,m95,distribution,plan){
 const issues=[];
 if(!Number.isInteger(capacity)||capacity<2||capacity>40)issues.push('invalid_capacity');
 if(m94?.stage!=='M94'||m94?.passed!==true||m94?.capacity!==capacity||m94?.remoteInputEnabled!==false)issues.push('m94_not_approved_for_capacity');
 if(m95?.stage!=='M95'||m95?.passed!==true||m95?.remoteInputEnabled!==false||m95?.teacherCount!==1||m95?.studentCount<2||m95?.studentCount>5)issues.push('m95_pilot_not_approved');
 if(distribution?.stage!=='M80'||distribution?.passed!==true||distribution?.requireInstallers!==true||distribution?.liveInputEnabled!==false)issues.push('m80_installers_not_verified');
 const hashes={};
 for(const role of ['Teacher','Student']){
  const matches=Array.isArray(distribution?.packages)?distribution.packages.filter(p=>p?.role===role):[];
  const h=matches[0]?.installer?.sha256;
  if(matches.length!==1||typeof h!=='string'||!/^[a-f0-9]{64}$/i.test(h))issues.push('missing_installer_hash_'+role.toLowerCase());
  else hashes[role]=h.toLowerCase();
 }
 if(!plan||typeof plan!=='object'||Array.isArray(plan))plan={};
 if(plan.operatorApproved!==true)issues.push('operator_not_approved');
 if(plan.remoteInputEnabled!==false)issues.push('remote_input_must_remain_disabled');
 const waves=Array.isArray(plan.waves)?plan.waves:[];
 if(waves.length<1||waves.length>10)issues.push('invalid_wave_count');
 let total=0;const summaries=[];
 for(const [i,w] of waves.entries()){
  const count=w?.students;
  if(!Number.isInteger(count)||count<1||count>10)issues.push(`invalid_wave_size_${i+1}`);
  else total+=count;
  if(i===0&&(count<2||count>5))issues.push('first_wave_must_be_2_to_5_students');
  if(w?.approvedToProceed!==true)issues.push(`wave_not_approved_${i+1}`);
  for(const check of CHECKS)if(w?.[check]!==true)issues.push(`wave_${i+1}_missing_${check}`);
  summaries.push({wave:i+1,students:Number.isInteger(count)?count:null,verified:CHECKS.every(c=>w?.[c]===true)&&w?.approvedToProceed===true});
 }
 if(Number.isInteger(capacity)&&total!==capacity)issues.push('wave_total_does_not_match_capacity');
 // No machine IDs, operator names, passwords or keys in output.
 return {stage:'M96',passed:issues.length===0,capacity,plannedStudents:total,waves:summaries,installerSha256:hashes,issues,remoteInputEnabled:false,limitations:'Offline operator attestations and staged plan only. Does not deploy, verify remote installations, or establish live device readiness. Stop between waves and verify on physical Windows PCs.'};
}
function main(args){
 if(args.length!==6)throw Error('Usage: node windows/M96-Staged-Rollout.js <capacity> <m94.json> <m95.json> <m80.json> <plan.json> <output.json>');
 const [n,a,b,c,d,out]=args;if(!out.toLowerCase().endsWith('.json'))throw Error('output_must_be_json');
 const result=evaluate(Number(n),readJson(a),readJson(b),readJson(c),readJson(d));
 fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{mode:0o600});
 console.log(`M96: ${result.passed?'PASS':'FAIL'} (${result.issues.length} issues)`);
 if(!result.passed)process.exitCode=1;
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error('M96:',e.message);process.exitCode=2;}}
module.exports={CHECKS,evaluate};
