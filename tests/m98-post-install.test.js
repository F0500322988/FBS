'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {verify}=require('../windows/M98-Verify-Report');
const root=path.join(__dirname,'..');
function sample(role='Teacher'){
 const names=['install_directory','role_executable','bundled_node','runtime_entry'];
 if(role==='Student')names.push('student_configuration_script','student_agent_launcher');
 return {stage:'M98',role,passed:true,failedCount:0,remoteInputEnabled:false,checks:names.map(name=>({name,passed:true,remedy:''}))};
}
test('teacher complete report passes',()=>assert.equal(verify(sample()).passed,true));
test('student complete report passes',()=>assert.equal(verify(sample('Student')).passed,true));
test('missing required check fails',()=>{const s=sample();s.checks.pop();assert.equal(verify(s).passed,false)});
test('failed check fails',()=>{const s=sample();s.checks[0].passed=false;assert.equal(verify(s).passed,false)});
test('duplicate check fails',()=>{const s=sample();s.checks.push(s.checks[0]);assert.equal(verify(s).passed,false)});
test('wrong stage fails',()=>{const s=sample();s.stage='M97';assert.equal(verify(s).passed,false)});
test('unknown role fails',()=>{const s=sample();s.role='Admin';assert.equal(verify(s).passed,false)});
test('remote input enabled fails closed',()=>{const s=sample();s.remoteInputEnabled=true;assert.equal(verify(s).passed,false)});
test('failedCount mismatch fails',()=>{const s=sample();s.failedCount=1;assert.equal(verify(s).passed,false)});
test('invalid check value fails',()=>{const s=sample();s.checks[0].passed='true';assert.equal(verify(s).passed,false)});
test('missing checks fails',()=>{const s=sample();delete s.checks;assert.equal(verify(s).passed,false)});
test('PowerShell script is read-only and explicitly scoped',()=>{const script=fs.readFileSync(path.join(root,'windows/M98-Post-Install.ps1'),'utf8');assert.match(script,/Get-FileHash/);assert.match(script,/Test-Path/);assert.doesNotMatch(script,/Start-Process|Invoke-Expression|Remove-Item|Set-ItemProperty/)});
