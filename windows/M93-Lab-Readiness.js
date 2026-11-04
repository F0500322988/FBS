'use strict';
// Offline, fail-closed aggregation of sanitized lab audit reports. No network or credentials.
const fs=require('node:fs');
const path=require('node:path');
const REQUIRED=['M84','M91','M92'];
const OPTIONAL=['M82','M83','M85','M86','M87','M88','M89','M90'];
const ALL=[...REQUIRED,...OPTIONAL];
function assess(expected,reports){
 const issues=[],checks=[];
 if(!Number.isInteger(expected)||expected<2||expected>40)issues.push('invalid_expected_capacity');
 if(!reports||typeof reports!=='object'||Array.isArray(reports))issues.push('invalid_reports');
 for(const stage of ALL){
  const r=reports?.[stage];
  if(r===undefined){if(REQUIRED.includes(stage))issues.push(`missing_${stage}`);continue;}
  const valid=!!r&&typeof r==='object'&&!Array.isArray(r)&&r.stage===stage&&typeof r.passed==='boolean';
  if(!valid){issues.push(`invalid_${stage}`);checks.push({stage,passed:false});continue;}
  if(r.passed!==true)issues.push(`failed_${stage}`);
  if(r.remoteInputEnabled===true)issues.push(`unsafe_remote_input_${stage}`);
  if(['M84','M85','M86','M91','M92'].includes(stage)&&r.expected!==expected)issues.push(`capacity_mismatch_${stage}`);
  if(stage==='M84'&&(!Number.isInteger(r.approvedOnline)||r.approvedOnline<expected||!Number.isInteger(r.onlineLive)||r.onlineLive<expected))issues.push('insufficient_enrolled_devices');
  if(stage==='M91'&&(!Number.isInteger(r.progressingCount)||r.progressingCount<Math.ceil(expected*.8)))issues.push('insufficient_progressing_previews');
  if(stage==='M92'&&(!Number.isInteger(r.continuousUpdatingDevices)||r.continuousUpdatingDevices<Math.ceil(expected*.8)||!Number.isFinite(r.p95LatencyMs)))issues.push('insufficient_performance_evidence');
  checks.push({stage,passed:r.passed===true});
 }
 return {stage:'M93',passed:issues.length===0,expected,requiredStages:REQUIRED,checks,issues:[...new Set(issues)],remoteInputEnabled:false,limitations:'Offline aggregation of supplied reports only; cannot verify report authenticity, recency, physical device count, student consent, image quality, network throughput, or Windows installer operation. Review on-site before deployment.'};
}
function loadReports(files){
 const reports={};
 for(const [stage,file] of Object.entries(files)){
  if(!ALL.includes(stage))throw Error('unsupported_stage_'+stage);
  const stat=fs.statSync(file);
  if(!stat.isFile()||stat.size>1024*1024)throw Error('invalid_report_size_'+stage);
  reports[stage]=JSON.parse(fs.readFileSync(file,'utf8'));
 }
 return reports;
}
function parseArgs(args){
 if(args.length<2)throw Error('Usage: node windows/M93-Lab-Readiness.js <expected 2..40> <output.json> --m84 <report.json> --m91 <report.json> --m92 <report.json> [--m82 ... --m90 ...]');
 const expected=Number(args[0]),output=args[1],files={};
 if(!output||!output.toLowerCase().endsWith('.json'))throw Error('output_must_be_json');
 for(let i=2;i<args.length;i+=2){
  const flag=args[i],file=args[i+1];
  const stage=/^--m(\d{2})$/.exec(flag||'');
  if(!stage||!file||!ALL.includes('M'+stage[1])||files['M'+stage[1]])throw Error('invalid_or_duplicate_report_argument');
  files['M'+stage[1]]=file;
 }
 return {expected,output,files};
}
function main(args){
 const {expected,output,files}=parseArgs(args);
 const report=assess(expected,loadReports(files));
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify(report,null,2));
 if(!report.passed)process.exitCode=1;
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error('M93:',e.message);process.exitCode=1;}}
module.exports={assess,loadReports,parseArgs};
