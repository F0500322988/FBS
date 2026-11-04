'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {check} = require('./M76-Package-Check');
const {execFileSync} = require('node:child_process');
function hash(file) {return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function inspect(root, options={}) {
  const problems=[]; const packages=[];
  for(const role of ['Teacher','Student']) {
    const dir=path.join(root,role);
    const result=check(dir,role);
    for(const problem of result.problems) problems.push(`${role}: ${problem}`);
    const zip=path.join(root,`FBS-Classroom-${role}-M76-Portable.zip`);
    let portable=null;
    try {const st=fs.statSync(zip); if(!st.isFile()||st.size===0) throw Error(); portable={name:path.basename(zip),sizeBytes:st.size,sha256:hash(zip)};}
    catch {problems.push(`${role}: portable ZIP missing or empty`);}
    packages.push({role,files:result.files,portable});
  }
  if(packages[0].portable && packages[1].portable && packages[0].portable.sha256===packages[1].portable.sha256) problems.push('Teacher and Student ZIP hashes are identical');
  if(options.requireInstallers) {
    for(const role of ['Teacher','Student']) {
      const name=`FBS-Classroom-${role}-M76-Setup-PREVIEW.exe`;
      const file=path.join(root,name);
      try {const stat=fs.statSync(file);if(!stat.isFile()||stat.size===0) throw Error(); packages.find(p=>p.role===role).installer={name,sizeBytes:stat.size,sha256:hash(file)};}
      catch {problems.push(`${role}: installer EXE missing or empty`);}
    }
  }
  // The M76 summary is informative; never accept its 'passed' field as proof of current file integrity.
  return {stage:'M80',passed:problems.length===0,requireInstallers:!!options.requireInstallers,liveInputEnabled:false,packages,problems};
}
if(require.main===module) {
 const [root,output,flag]=process.argv.slice(2);
 if(!root||!output||!['undefined','--require-installers'].includes(typeof flag==='undefined'?'undefined':flag)) {console.error('Usage: node windows/M80-Distribution-Gate.js <dist-m76> <report.json> [--require-installers]');process.exit(2);}
 try {const result=inspect(path.resolve(root),{requireInstallers:flag==='--require-installers'});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(`M80: ${result.passed?'PASS':'FAIL'} (${result.problems.length} problems)`);process.exitCode=result.passed?0:1;}
 catch(err) {console.error(err.message);process.exitCode=2;}
}
module.exports={inspect};
