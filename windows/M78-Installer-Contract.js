'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {required,check}=require('./M76-Package-Check');
const ROLES=['Teacher','Student'];
function section(source,name) {
 const match=source.match(new RegExp('^\\['+name+'\\]\\s*$','im'));
 if(!match) return '';
 const rest=source.slice(match.index+match[0].length);
 return rest.split(/^\[[^\]\r\n]+\]\s*$/m)[0];
}
function setting(src,key) {
 const line=src.match(new RegExp('^'+key+'\\s*=\\s*(.+)$','im'));
 return line?.[1].trim()||'';
}
function verifyScript(src,role) {
 const problems=[];
 const setup=section(src,'Setup');
 const files=section(src,'Files');
 const icons=section(src,'Icons');
 const run=section(src,'Run');
 if(!setup) problems.push('Missing Setup section');
 if(!files) problems.push('Missing Files section');
 if(!icons) problems.push('Missing Icons section');
 if(!/^#ifndef\s+StageRoot/m.test(src)||!/#error\s+StageRoot/m.test(src)) problems.push('StageRoot is not required');
 if(!/AppId=\{\{[0-9a-f-]{36}\}/i.test(setup)) problems.push('Missing stable AppId');
 if(!/OutputBaseFilename=FBS-Classroom-/.test(setup)) problems.push('Missing output filename');
 if(!/ArchitecturesAllowed=x64compatible/i.test(setup)) problems.push('x64 architecture guard missing');
 if(!/PrivilegesRequired=(admin|lowest)/i.test(setup)) problems.push('Missing privilege declaration');
 const exe=role==='Teacher'?'FBS.Teacher.exe':'FBS.Student.Native.exe';
 if(!icons.includes(exe)) problems.push('Shortcut does not point to '+exe);
 if(!files.includes('DestDir: "{app}\\Runtime"')) problems.push('Runtime is not packaged');
 if(!files.includes(`DestDir: "{app}\\${role}"`)) problems.push('Role files are not packaged');
 if(role==='Student'&&!files.includes('Configure-Student.ps1')) problems.push('Student configuration script missing');
 // Inno [Run] entries are executable actions; comments do not count.
 if(run.split(/\r?\n/).some(x=>x.trim()&&!/^\s*;/.test(x))) problems.push('Automatic post-install execution is forbidden');
 if(/^\s*Name:\s*"\{(commonstartup|userstartup)\}/im.test(icons)) problems.push('Automatic startup shortcut forbidden');
 return {role,passed:problems.length===0,appId:setting(setup,'AppId'),problems};
}
function verify(root,stage) {
 const roles=ROLES.map(role=>{
  const script=path.join(root,'windows','installer',`M76-${role}.iss`);
  try {
   const result=verifyScript(fs.readFileSync(script,'utf8'),role);
   if(stage){const staged=check(path.join(stage,role),role);if(!staged.passed)result.problems.push(...staged.problems);result.passed=result.problems.length===0;}
   return result;
  }catch(e){return {role,passed:false,appId:'',problems:['Missing or unreadable installer script or stage: '+e.code]};}
 });
 if(roles[0].appId&&roles[0].appId===roles[1].appId){roles.forEach(r=>{r.passed=false;r.problems.push('Teacher and student AppIds must differ')});}
 return {stage:'M78',passed:roles.every(r=>r.passed),liveInputEnabled:false,roles};
}
if(require.main===module){
 const [root,output,stage]=process.argv.slice(2);
 if(!root||!output){console.error('Usage: node windows/M78-Installer-Contract.js <project-root> <report.json> [dist-m76]');process.exit(2)}
 const report=verify(path.resolve(root),stage?path.resolve(stage):undefined);
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,problems:report.roles.flatMap(r=>r.problems)}));
 process.exitCode=report.passed?0:1;
}
module.exports={verify,verifyScript};
