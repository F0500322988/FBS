'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {inspectProject,inspectNativeInput}=require('../windows/M115-EXE-And-Control-Readiness');
test('M115 installer source prerequisites exist',()=>assert.ok(Object.values(inspectProject().present).every(Boolean)));
test('M115 native input remains disabled until Windows consent verification',()=>{
 const s=inspectNativeInput(); assert.equal(s.adapterExplicitlyDisabled,true); assert.equal(s.gateExplicitlyDisabled,true); assert.equal(s.nativeInputWired,false);
});
test('M115 does not claim remote input is ready',()=>assert.equal(inspectProject().realRemoteInputReady,false));
test('M115 report contains no secrets',()=>assert.doesNotMatch(JSON.stringify(inspectProject()),/password|pairing_key|private_key/i));
