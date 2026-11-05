'use strict';
const fs=require('node:fs');
const required=['role_executable','process_seen_at_start','process_still_running','ui_confirmed_by_operator','behavior_confirmed_by_operator'];
function verify(r){
 const issues=[];
 if(!r||r.stage!=='M100')issues.push('invalid_stage');
 if(!['Teacher','Student'].includes(r?.role))issues.push('invalid_role');
 if(r?.remoteInputEnabled!==false)issues.push('remote_input_must_remain_disabled');
 if(r?.scope!=='manual_launch_process_observation_and_operator_attestation')issues.push('invalid_scope');
 if(!Number.isInteger(r?.observationSeconds)||r.observationSeconds<2||r.observationSeconds>60)issues.push('invalid_window');
 const checks=Array.isArray(r?.checks)?r.checks:[];
 if(checks.length!==required.length||new Set(checks.map(c=>c?.name)).size!==required.length)issues.push('invalid_checks');
 for(const name of required){if(!checks.some(c=>c?.name===name&&c.passed===true))issues.push('failed_'+name)}
 if(r?.failedCount!==0||r?.passed!==true)issues.push('reported_failure');
 return {stage:'M100',passed:issues.length===0,issues};
}
if(require.main===module){
 try{const r=verify(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));console.log(JSON.stringify(r,null,2));if(!r.passed)process.exitCode=1}
 catch(e){console.error('Unable to validate M100 report:',e.message);process.exitCode=1}
}
module.exports={verify,required};
