'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {verify,combine}=require('../windows/M79-Install-Lifecycle');
const fields=['installedExe','startMenuShortcut','shortcutTargetMatches','uninstallEntry','uninstallCommand','launchObserved','uninstallObserved','exeRemovedAfterUninstall','shortcutRemovedAfterUninstall','uninstallEntryRemovedAfterUninstall'];
function report(role){return {stage:'M79',schemaVersion:1,role,liveInputEnabled:false,checks:Object.fromEntries(fields.map(x=>[x,true]))}}
test('M79 accepts two complete role reports',()=>assert.equal(verify([report('Teacher'),report('Student')]).passed,true));
test('M79 rejects missing role',()=>assert.equal(verify([report('Teacher')]).passed,false));
test('M79 rejects duplicate role',()=>assert.equal(verify([report('Teacher'),report('Teacher')]).passed,false));
test('M79 rejects missing check',()=>{const s=report('Student');delete s.checks.uninstallObserved;assert.equal(verify([report('Teacher'),s]).passed,false)});
test('M79 rejects disabled safety not confirmed',()=>{const s=report('Student');s.liveInputEnabled=true;assert.equal(verify([report('Teacher'),s]).passed,false)});
test('M79 rejects schema mismatch',()=>{const t=report('Teacher');t.schemaVersion=2;assert.equal(verify([t,report('Student')]).passed,false)});
test('M79 PowerShell does not execute uninstall automatically',()=>{const s=fs.readFileSync(path.join(__dirname,'../windows/Test-M79-Install-Lifecycle.ps1'),'utf8');assert.match(s,/UninstallString/);assert.doesNotMatch(s,/Start-Process\s+.*UninstallString|Invoke-Expression/)});

test('M79 combine requires both phases and explicit confirmations',()=>{
 const base={role:'Teacher',checks:{installedExe:true,startMenuShortcut:true,shortcutTargetMatches:true,uninstallEntry:true,uninstallCommand:true}};
 const after={role:'Teacher',phase:'Uninstalled',checks:{exeRemovedAfterUninstall:true,shortcutRemovedAfterUninstall:true,uninstallEntryRemovedAfterUninstall:true}};
 const r=combine({...base,phase:'Installed'},after,{});
 assert.equal(r.checks.launchObserved,false);assert.equal(r.liveInputEnabled,null);
 assert.equal(combine({...base,phase:'Installed'},after,{launchObserved:true,uninstallObserved:true,liveInputEnabled:false}).checks.uninstallObserved,true);
});
