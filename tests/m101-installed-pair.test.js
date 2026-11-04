'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assess}=require('../windows/M101-Installed-Pair-Check');
const {required}=require('../windows/M100-Verify-Report');
function startup(role){return {stage:'M100',role,remoteInputEnabled:false,scope:'manual_launch_process_observation_and_operator_attestation',observationSeconds:5,checks:required.map(name=>({name,passed:true})),failedCount:0,passed:true}}
function enrollment(){return {stage:'M84',passed:true,expected:1,approvedOnline:1,issues:[]}}
test('M101 valid reports',()=>assert.equal(assess(startup('Teacher'),startup('Student'),enrollment()).passed,true));
test('M101 rejects reversed roles',()=>assert.equal(assess(startup('Student'),startup('Teacher'),enrollment()).passed,false));
test('M101 rejects teacher failure',()=>{let t=startup('Teacher');t.passed=false;assert.equal(assess(t,startup('Student'),enrollment()).passed,false)});
test('M101 rejects student failure',()=>{let s=startup('Student');s.checks[0].passed=false;assert.equal(assess(startup('Teacher'),s,enrollment()).passed,false)});
test('M101 rejects missing enrollment',()=>assert.equal(assess(startup('Teacher'),startup('Student'),null).passed,false));
test('M101 rejects enrollment failure',()=>{let e=enrollment();e.passed=false;assert.equal(assess(startup('Teacher'),startup('Student'),e).passed,false)});
test('M101 rejects count mismatch',()=>assert.equal(assess(startup('Teacher'),startup('Student'),enrollment(),2).passed,false));
test('M101 rejects low online count',()=>{let e=enrollment();e.approvedOnline=0;assert.equal(assess(startup('Teacher'),startup('Student'),e).passed,false)});
test('M101 rejects enrollment issues',()=>{let e=enrollment();e.issues=['bad'];assert.equal(assess(startup('Teacher'),startup('Student'),e).passed,false)});
test('M101 rejects zero count',()=>assert.equal(assess(startup('Teacher'),startup('Student'),enrollment(),0).passed,false));
test('M101 rejects >40 count',()=>assert.equal(assess(startup('Teacher'),startup('Student'),enrollment(),41).passed,false));
test('M101 report never includes identifiers or secrets',()=>{let r=assess(startup('Teacher'),startup('Student'),enrollment());assert.equal(r.remoteInputEnabled,false);assert.doesNotMatch(JSON.stringify(r),/password|studentId|cookie|token/i)});
