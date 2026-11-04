'use strict';
// Offline deployment gate. Human attestations are not independently verified.
const fs=require('node:fs');
const ITEMS=['isolated_lab_network','teacher_static_ip','udp_4181_firewall_checked','tls_fingerprint_verified','student_consent_stop_verified','teacher_student_install_tested','uninstall_rollback_tested','operator_approved'];
function evaluate(capacity,lab,distribution,attestations){
 const issues=[];
 if(!Number.isInteger(capacity)||capacity<2||capacity>40)issues.push('invalid_capacity');
 if(!lab||lab.stage!=='M93'||lab.passed!==true||lab.expected!==capacity||lab.remoteInputEnabled!==false)issues.push('lab_readiness_not_verified');
 if(!distribution||distribution.stage!=='M80'||distribution.passed!==true||distribution.requireInstallers!==true||distribution.liveInputEnabled!==false)issues.push('installer_distribution_not_verified');
 for(const role of ['Teacher','Student']){
  const p=distribution?.packages?.find(x=>x?.role===role);
  if(!p?.installer?.sha256||!/^[a-f0-9]{64}$/i.test(p.installer.sha256)||!p?.portable?.sha256||!/^[a-f0-9]{64}$/i.test(p.portable.sha256))issues.push('missing_package_hash_'+role.toLowerCase());
 }
 if(!attestations||typeof attestations!=='object'||Array.isArray(attestations))issues.push('invalid_attestations');
 for(const item of ITEMS)if(attestations?.[item]!==true)issues.push('not_confirmed_'+item);
 return {stage:'M94',passed:issues.length===0,capacity,checklist:ITEMS.map(id=>({id,confirmed:attestations?.[id]===true})),issues,remoteInputEnabled:false,limitations:'Manual confirmations are self-attested, not independently tested. Source reports may be stale or forged. Do not deploy until operator validates real Windows devices and installer rollback.'};
}
function readJson(file){const s=fs.statSync(file);if(!s.isFile()||s.size>1024*1024)throw Error('invalid_input_file');return JSON.parse(fs.readFileSync(file,'utf8'));}
function main(args){
 if(args.length!==5)throw Error('Usage: node windows/M94-Deployment-Gate.js <capacity 2..40> <m93.json> <m80.json> <checklist.json> <output.json>');
 const [capacity,lab,distribution,checklist,output]=args;
 if(!output.toLowerCase().endsWith('.json'))throw Error('output_must_be_json');
 const result=evaluate(Number(capacity),readJson(lab),readJson(distribution),readJson(checklist));
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{mode:0o600});
 console.log(`M94: ${result.passed?'PASS':'FAIL'} (${result.issues.length} issues)`);
 if(!result.passed)process.exitCode=1;
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error('M94:',e.message);process.exitCode=2;}}
module.exports={ITEMS,evaluate,readJson};
