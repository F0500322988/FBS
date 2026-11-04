'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {REQUIRED,validateReport,summarize,template}=require('../windows/M63-Field-Evidence');
function passed(role){const x=template(role);for(const e of x.observations){e.status='PASS';e.note='Observed on two real Windows computers';}return x;}
test('M63 templates fail closed',()=>{const x=template('Teacher');assert.equal(x.observations.length,7);assert.equal(validateReport(x,'Teacher').valid,true);assert.equal(summarize(x,template('Student')).fieldTestsCompleted,false)});
test('M63 all observations need both roles',()=>{const x=summarize(passed('Teacher'),passed('Student'));assert.equal(x.fieldTestsCompleted,true);assert.equal(x.readyForLiveInput,false);assert.equal(x.liveInputEnabled,false)});
test('M63 missing, duplicate and invalid statuses rejected',()=>{const x=passed('Teacher');x.observations.pop();assert.equal(validateReport(x,'Teacher').valid,false);x.observations.push({...x.observations[0]});assert.equal(validateReport(x,'Teacher').valid,false);x.observations[0].status='UNKNOWN';assert.equal(validateReport(x,'Teacher').valid,false)});
test('M63 notes and roles validated',()=>{const x=passed('Teacher');x.observations[0].note='';assert.equal(validateReport(x,'Teacher').valid,false);assert.equal(validateReport(passed('Teacher'),'Student').valid,false)});
test('M63 one failed or untested observation blocks completion',()=>{for(const status of ['FAIL','NOT_TESTED']){const x=passed('Student');x.observations[0].status=status;assert.equal(summarize(passed('Teacher'),x).fieldTestsCompleted,false)}});
test('M63 required checks cover discovery, consent, preview, stop and reconnection',()=>{for(const id of ['device-discovery','student-consent','screen-preview','student-stop','network-disconnect','reconnect-requires-consent'])assert.ok(REQUIRED.includes(id))});
