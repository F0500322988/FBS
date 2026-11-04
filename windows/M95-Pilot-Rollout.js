'use strict';
// Offline pilot evidence gate. Never installs, uninstalls or controls devices.
const fs=require('node:fs');
const crypto=require('node:crypto');
const REQUIRED=['installed','launch_verified','lan_connected','tls_verified','consent_verified','stop_verified','uninstall_verified','rollback_verified'];
function evaluate(deployment,pilot){
 const issues=[];
 if(deployment?.stage!=='M94'||deployment?.passed!==true||deployment?.remoteInputEnabled!==false)issues.push('m94_not_approved');
 if(!pilot||typeof pilot!=='object'||Array.isArray(pilot))pilot={};
 if(pilot?.operatorApproved!==true)issues.push('operator_not_approved');
 const devices=Array.isArray(pilot.devices)?pilot.devices:[];
 if(devices.length<3||devices.length>6)issues.push('pilot_requires_teacher_and_2_to_5_students');
 const ids=new Set();let teacher=0,student=0;
 for(const [i,d] of devices.entries()){
  if(!d||typeof d!=='object'||Array.isArray(d)){issues.push(`invalid_device_${i+1}`);continue;}
  if(typeof d.id!=='string'||!/^[-_a-zA-Z0-9]{1,64}$/.test(d.id)||ids.has(d.id))issues.push(`invalid_or_duplicate_device_${i+1}`);
  else ids.add(d.id);
  if(d.role==='Teacher')teacher++;else if(d.role==='Student')student++;else issues.push(`invalid_role_${i+1}`);
  for(const item of REQUIRED)if(d[item]!==true)issues.push(`unverified_${item}_${i+1}`);
 }
 if(teacher!==1||student<2||student>5)issues.push('invalid_role_counts');
 if(pilot?.remoteInputEnabled!==false)issues.push('remote_input_must_remain_disabled');
 // No device IDs or secret fields are emitted to the summary.
 return {stage:'M95',passed:issues.length===0,pilotDeviceCount:devices.length,teacherCount:teacher,studentCount:student,requiredChecks:REQUIRED,issues,remoteInputEnabled:false,limitations:'Offline operator-provided attestations only; not proof of actual installation, connectivity, consent, uninstall or rollback. Verify on physical Windows PCs.'};
}
function readJson(path){const s=fs.statSync(path);if(!s.isFile()||s.size>1024*1024)throw Error('invalid_input_file');return JSON.parse(fs.readFileSync(path,'utf8'));}
function main(args){
 if(args.length!==3)throw Error('Usage: node windows/M95-Pilot-Rollout.js <m94-deployment.json> <pilot-evidence.json> <output.json>');
 const [m94,pilot,out]=args;if(!out.toLowerCase().endsWith('.json'))throw Error('output_must_be_json');
 const result=evaluate(readJson(m94),readJson(pilot));
 fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{mode:0o600});
 console.log(`M95: ${result.passed?'PASS':'FAIL'} (${result.issues.length} issues)`);
 if(!result.passed)process.exitCode=1;
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error('M95:',e.message);process.exitCode=2;}}
module.exports={REQUIRED,evaluate,readJson};
