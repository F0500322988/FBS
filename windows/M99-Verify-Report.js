'use strict';
const fs=require('node:fs');
const REQUIRED=['install_directory','bundled_node','runtime_entry','node_version_runs','entry_syntax'];
function verify(report){
 const issues=[];
 if(!report || report.stage!=='M99' || !['Teacher','Student'].includes(report.role))return {passed:false,issues:['invalid_stage_or_role']};
 if(!Array.isArray(report.checks))return {passed:false,issues:['missing_checks']};
 const names=new Set();
 for(const check of report.checks){
  if(!check || typeof check.name!=='string' || typeof check.passed!=='boolean'){issues.push('invalid_check');continue;}
  if(names.has(check.name))issues.push('duplicate_check');
  names.add(check.name);
  if(!check.passed)issues.push('failed_'+check.name);
 }
 for(const name of REQUIRED)if(!names.has(name))issues.push('missing_'+name);
 if(report.passed!==true)issues.push('report_not_passed');
 if(report.failedCount!==0)issues.push('failed_count_nonzero');
 if(report.remoteInputEnabled!==false)issues.push('remote_input_not_disabled');
 if(report.scope!=='bundled_node_version_and_entry_syntax_only')issues.push('unexpected_scope');
 return {stage:'M99',role:report.role,passed:issues.length===0,issues};
}
if(require.main===module){
 const [,,input,output]=process.argv;
 if(!input){console.error('Usage: node windows/M99-Verify-Report.js <report.json> [verification.json]');process.exit(2);}
 try{const result=verify(JSON.parse(fs.readFileSync(input,'utf8').replace(/^\uFEFF/,'')));if(output)fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;}
 catch{console.error('Unable to read or parse M99 report');process.exitCode=1;}
}
module.exports={verify};
