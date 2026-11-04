'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {template,validate,review}=require('../windows/M75-Native-Launch-Evidence');
function complete(role,id){const r=template(role);r.deviceId=id;r.observedAt='2026-11-03T10:00:00+03:00';for(const k of Object.keys(r.checks))r.checks[k]='PASS';return r;}
test('templates default to NOT_TESTED, never pre-approve',()=>{for(const role of ['Teacher','Student'])assert.ok(Object.values(template(role).checks).every(x=>x==='NOT_TESTED'));});
test('rejects incomplete human evidence',()=>assert.equal(validate(template('Teacher')).passed,false));
test('rejects invalid role',()=>assert.throws(()=>template('Other')));
test('complete two-PC evidence passes review',()=>assert.equal(review(complete('Teacher','A'),complete('Student','B')).passed,true));
test('same device cannot represent two PCs',()=>assert.equal(review(complete('Teacher','A'),complete('Student','A')).passed,false));
test('student stop must be observed',()=>{const s=complete('Student','B');s.checks.studentStopAvailable='NOT_TESTED';assert.equal(review(complete('Teacher','A'),s).passed,false);});
test('unknown checks are rejected',()=>{const t=complete('Teacher','A');t.checks.injected='PASS';assert.equal(validate(t).passed,false);});
test('report does not authorize live input',()=>{const r=review(complete('Teacher','A'),complete('Student','B'));assert.equal(r.approvedForLiveInput,false);assert.equal(r.liveInputEnabled,false);});
