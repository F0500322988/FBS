'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {required} = require('./M76-Package-Check');
function audit(root, role, baseline) {
  if (!Object.hasOwn(required,role)) throw new Error('Invalid role');
  const problems=[]; const files=[];
  const expected = baseline && baseline.files;
  if (baseline && (baseline.role!==role || baseline.passed!==true || !Array.isArray(expected))) problems.push('Invalid or mismatched M76 baseline');
  for (const rel of required[role]) {
    const p=path.join(root,...rel.split('/'));
    try {
      const stat=fs.lstatSync(p);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size===0) throw Error('not a regular nonempty file');
      const sha256=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
      files.push({path:rel,sizeBytes:stat.size,sha256});
      if (baseline) {
        const original=expected?.find(x=>x.path===rel);
        if (!original || original.sha256!==sha256 || original.sizeBytes!==stat.size) problems.push('Baseline mismatch: '+rel);
      }
    } catch { problems.push('Missing or invalid: '+rel); }
  }
  return {stage:'M77',role,passed:problems.length===0,liveInputEnabled:false,files,problems};
}
if (require.main===module) {
  const [root,role,output,baselinePath]=process.argv.slice(2);
  if (!root||!role||!output) {console.error('Usage: node M77-Install-Audit.js <install-dir> Teacher|Student <output.json> [m76-role-report.json]');process.exit(2)}
  try {
    const baseline=baselinePath?JSON.parse(fs.readFileSync(baselinePath,'utf8')):undefined;
    const result=audit(root,role,baseline);
    fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify({passed:result.passed,role,problems:result.problems}));
    process.exitCode=result.passed?0:1;
  } catch(e) {console.error(e.message);process.exitCode=2}
}
module.exports={audit};
