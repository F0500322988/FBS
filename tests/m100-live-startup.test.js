'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {verify,required}=require('../windows/M100-Verify-Report');
function sample(role='Teacher'){return {stage:'M100',role,passed:true,failedCount:0,observationSeconds:10,remoteInputEnabled:false,scope:'manual_launch_process_observation_and_operator_attestation',checks:required.map(name=>({name,passed:true}))};}
test('teacher pass',()=>assert.equal(verify(sample()).passed,true));
test('student pass',()=>assert.equal(verify(sample('Student')).passed,true));
test('missing check fails',()=>{const r=sample();r.checks.pop();assert.equal(verify(r).passed,false)});
test('failed check fails',()=>{const r=sample();r.checks[0].passed=false;assert.equal(verify(r).passed,false)});
test('duplicate check fails',()=>{const r=sample();r.checks.push(r.checks[0]);assert.equal(verify(r).passed,false)});
test('wrong role fails',()=>{const r=sample();r.role='Unknown';assert.equal(verify(r).passed,false)});
test('wrong stage fails',()=>{const r=sample();r.stage='M99';assert.equal(verify(r).passed,false)});
test('remote input enabled fails',()=>{const r=sample();r.remoteInputEnabled=true;assert.equal(verify(r).passed,false)});
test('short window fails',()=>{const r=sample();r.observationSeconds=1;assert.equal(verify(r).passed,false)});
test('self reported failure fails',()=>{const r=sample();r.passed=false;assert.equal(verify(r).passed,false)});
test('powershell is observation-only',()=>{const s=fs.readFileSync(path.join(__dirname,'../windows/M100-Live-Startup.ps1'),'utf8');assert.match(s,/Get-CimInstance/);assert.match(s,/Start-Sleep/);assert.doesNotMatch(s,/Start-Process|Invoke-Expression|Remove-Item|Stop-Process/)});
test('powershell requires explicit operator attestations',()=>{const s=fs.readFileSync(path.join(__dirname,'../windows/M100-Live-Startup.ps1'),'utf8');assert.match(s,/ConfirmedVisibleUI/);assert.match(s,/ConfirmedExpectedBehavior/)});
