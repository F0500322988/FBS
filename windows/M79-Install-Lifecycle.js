'use strict';
const fs = require('node:fs');
const ROLES = ['Teacher','Student'];
function verify(reports) {
  const problems=[];
  if (!Array.isArray(reports) || reports.length!==2) problems.push('Exactly two role reports are required');
  for (const role of ROLES) {
    const matches=(reports||[]).filter(r=>r && r.role===role);
    if(matches.length!==1){problems.push(`Expected exactly one ${role} report`);continue;}
    const r=matches[0];
    if(r.stage!=='M79'||r.schemaVersion!==1) problems.push(`${role}: invalid report schema`);
    for(const field of ['installedExe','startMenuShortcut','shortcutTargetMatches','uninstallEntry','uninstallCommand','launchObserved','uninstallObserved','exeRemovedAfterUninstall','shortcutRemovedAfterUninstall','uninstallEntryRemovedAfterUninstall']) {
      if(r.checks?.[field]!==true) problems.push(`${role}: ${field} not verified`);
    }
    if(r.liveInputEnabled!==false) problems.push(`${role}: live input state not confirmed disabled`);
  }
  return {stage:'M79',passed:problems.length===0,roles:ROLES,problems};
}
function combine(installed,uninstalled,confirmation) {
  if(installed?.role!==uninstalled?.role || installed?.phase!=='Installed' || uninstalled?.phase!=='Uninstalled') throw new Error('Role or phase mismatch');
  const checks={
    installedExe:installed.checks?.installedExe===true,
    startMenuShortcut:installed.checks?.startMenuShortcut===true,
    shortcutTargetMatches:installed.checks?.shortcutTargetMatches===true,
    uninstallEntry:installed.checks?.uninstallEntry===true,
    uninstallCommand:installed.checks?.uninstallCommand===true,
    launchObserved:confirmation?.launchObserved===true,
    uninstallObserved:confirmation?.uninstallObserved===true,
    exeRemovedAfterUninstall:uninstalled.checks?.exeRemovedAfterUninstall===true,
    shortcutRemovedAfterUninstall:uninstalled.checks?.shortcutRemovedAfterUninstall===true,
    uninstallEntryRemovedAfterUninstall:uninstalled.checks?.uninstallEntryRemovedAfterUninstall===true
  };
  return {stage:'M79',schemaVersion:1,role:installed.role,liveInputEnabled:confirmation?.liveInputEnabled===false?false:null,checks};
}
if(require.main===module){
  if(process.argv[2]==='combine') {
    const [installedPath,uninstalledPath,confirmationPath,out]=process.argv.slice(3);
    if(!out){console.error('Usage: combine <installed.json> <uninstalled.json> <confirmation.json> <combined.json>');process.exit(2)}
    try{const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));fs.writeFileSync(out,JSON.stringify(combine(read(installedPath),read(uninstalledPath),read(confirmationPath)),null,2)+'\n');console.log('Combined evidence written');}catch(e){console.error(e.message);process.exitCode=2} 
  } else {
  const [teacherPath,studentPath,out]=process.argv.slice(2);
  if(!teacherPath||!studentPath||!out){console.error('Usage: node M79-Install-Lifecycle.js <teacher.json> <student.json> <result.json>');process.exit(2)}
  try {
    const result=verify([teacherPath,studentPath].map(p=>JSON.parse(fs.readFileSync(p,'utf8'))));
    fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result));process.exitCode=result.passed?0:1;
  }catch(e){console.error(e.message);process.exitCode=2}
  }
}
module.exports={verify,combine};
