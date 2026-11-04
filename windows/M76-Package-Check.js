'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const runtimeFiles = require('./Verify-M60-Runtime').required.filter(file => file.startsWith('Runtime/'));
const required = {
  Teacher: ['Teacher/FBS.Teacher.exe',...runtimeFiles],
  Student: ['Student/FBS.Student.Native.exe',...runtimeFiles,'Configure-Student.ps1']
};
function check(root, role) {
  if (!required[role]) throw new Error('Role must be Teacher or Student');
  const files = [];
  const problems = [];
  for (const relative of required[role]) {
    const absolute = path.join(root, ...relative.split('/'));
    try {
      const stat = fs.lstatSync(absolute);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size === 0) throw new Error('not a nonempty regular file');
      files.push({path:relative,sizeBytes:stat.size,sha256:crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex')});
    } catch { problems.push(`missing or invalid: ${relative}`); }
  }
  return {stage:'M76',role,passed:problems.length===0,liveInputEnabled:false,files,problems};
}
if (require.main === module) {
  const [root,role,output] = process.argv.slice(2);
  if (!root || !role) {console.error('Usage: node M76-Package-Check.js <stage-dir> Teacher|Student [report.json]');process.exit(2)}
  try {
    const result = check(root,role);
    if(output) fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result,null,2));
    process.exitCode=result.passed?0:1;
  } catch(e) {console.error(e.message);process.exitCode=2}
}
module.exports={check,required};
