'use strict';
const fs=require('node:fs');
const VALID_ROLES=new Set(['Teacher','Student']);
function evaluate(report,{requireExecution=false}={}){
 const issues=[];
 if(report?.stage!=='M97')issues.push('invalid_stage');
 if(!VALID_ROLES.has(report?.role))issues.push('invalid_role');
 if(!['dry-run','execute'].includes(report?.mode))issues.push('invalid_mode');
 if(report?.hashVerified!==true)issues.push('hash_not_verified');
 if(report?.passed!==true)issues.push('installer_report_failed');
 if(report?.remoteInputEnabled!==false)issues.push('remote_input_must_remain_disabled');
 if(requireExecution&&(report?.mode!=='execute'||report?.installerExitCode!==0))issues.push('execution_not_verified');
 if(report?.mode==='execute'&&report?.installerExitCode!==0)issues.push('installer_exit_not_zero');
 if(!Array.isArray(report?.issues)||report.issues.length!==0)issues.push('reported_issues');
 return {stage:'M97',passed:issues.length===0,role:VALID_ROLES.has(report?.role)?report.role:null,mode:report?.mode==='execute'?'execute':'dry-run',issues,remoteInputEnabled:false,limitations:'Report validation only; a zero exit code does not prove service health, screen consent, uninstall or rollback.'};
}
function main(args){
 if(args.length<2||args.length>3||args[2]&&args[2]!=='--require-execution')throw Error('Usage: node windows/M97-Install-Report.js <input.json> <output.json> [--require-execution]');
 const [input,output,flag]=args;
 if(!output.toLowerCase().endsWith('.json'))throw Error('output_must_be_json');
 const r=evaluate(JSON.parse(fs.readFileSync(input,'utf8')),{requireExecution:flag==='--require-execution'});
 fs.writeFileSync(output,JSON.stringify(r,null,2)+'\n',{mode:0o600});
 console.log(`M97 ${r.passed?'PASS':'FAIL'} (${r.issues.length} issues)`);
 if(!r.passed)process.exitCode=1;
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error('M97:',e.message);process.exitCode=2;}}
module.exports={evaluate};
