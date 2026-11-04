'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {evaluate,CHECKS}=require('../windows/M96-Staged-Rollout');
function fixtures(){
 const m94={stage:'M94',passed:true,capacity:21,remoteInputEnabled:false};
 const m95={stage:'M95',passed:true,teacherCount:1,studentCount:3,remoteInputEnabled:false};
 const m80={stage:'M80',passed:true,requireInstallers:true,liveInputEnabled:false,packages:['Teacher','Student'].map(role=>({role,installer:{sha256:'a'.repeat(64)}}))};
 const wave=n=>({students:n,approvedToProceed:true,...Object.fromEntries(CHECKS.map(c=>[c,true]))});
 const plan={operatorApproved:true,remoteInputEnabled:false,waves:[wave(3),wave(8),wave(10)]};
 return {m94,m95,m80,plan};
}
function run(f,capacity=21){return evaluate(capacity,f.m94,f.m95,f.m80,f.plan);}
test('valid 21-device plan',()=>{const r=run(fixtures());assert.equal(r.passed,true);assert.equal(r.plannedStudents,21);});
test('valid 40-device plan',()=>{const f=fixtures();f.m94.capacity=40;f.plan.waves=[3,7,10,10,10].map(n=>({...f.plan.waves[0],students:n}));assert.equal(run(f,40).passed,true);});
test('reject missing pilot',()=>{const f=fixtures();f.m95.passed=false;assert.equal(run(f).passed,false);});
test('reject deployment capacity mismatch',()=>{const f=fixtures();f.m94.capacity=40;assert.equal(run(f).passed,false);});
test('reject missing installer hash',()=>{const f=fixtures();f.m80.packages[0].installer.sha256='bad';assert.equal(run(f).passed,false);});
test('reject duplicate installer roles',()=>{const f=fixtures();f.m80.packages.push(f.m80.packages[0]);assert.equal(run(f).passed,false);});
test('reject remote input enabled',()=>{const f=fixtures();f.plan.remoteInputEnabled=true;assert.equal(run(f).passed,false);});
test('reject unapproved operator',()=>{const f=fixtures();f.plan.operatorApproved=false;assert.equal(run(f).passed,false);});
test('reject missing per-wave check',()=>{const f=fixtures();f.plan.waves[1].consent_stop_verified=false;assert.equal(run(f).passed,false);});
test('reject unapproved wave',()=>{const f=fixtures();f.plan.waves[1].approvedToProceed=false;assert.equal(run(f).passed,false);});
test('reject wave sum mismatch',()=>{const f=fixtures();f.plan.waves[2].students=9;assert.equal(run(f).passed,false);});
test('reject oversized wave',()=>{const f=fixtures();f.plan.waves[1].students=11;assert.equal(run(f).passed,false);});
test('reject oversized first wave',()=>{const f=fixtures();f.plan.waves[0].students=6;assert.equal(run(f).passed,false);});
test('reject missing plan',()=>{const f=fixtures();f.plan=null;assert.equal(run(f).passed,false);});
test('does not expose device IDs or secrets',()=>{const f=fixtures();f.plan.studentIds=['secret-student'];f.plan.password='secret-password';const r=JSON.stringify(run(f));assert.ok(!r.includes('secret-student'));assert.ok(!r.includes('secret-password'));});
