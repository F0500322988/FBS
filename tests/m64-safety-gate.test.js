'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {template}=require('../windows/M63-Field-Evidence');const {sourceSafety,assess}=require('../windows/M64-Safety-Gate');
const source=fs.readFileSync(path.join(__dirname,'../windows/FBS.Student.Native/WindowsInputAdapter.cs'),'utf8');
function passed(role){const x=template(role);for(const e of x.observations){e.status='PASS';e.note='Confirmed manually on two Windows 11 computers';}return x;}
test('M64 native adapter guards verified in current source',()=>{const x=sourceSafety(source);assert.equal(x.passed,true);assert.equal(x.checks.length,5)});
test('M64 evidence complete never enables remote input',()=>{const x=assess(passed('Teacher'),passed('Student'),source);assert.equal(x.reviewPassed,true);assert.equal(x.readyForLiveInput,false);assert.equal(x.liveInputEnabled,false)});
test('M64 missing field observation fails closed',()=>{const t=passed('Teacher');t.observations[0].status='NOT_TESTED';assert.equal(assess(t,passed('Student'),source).reviewPassed,false)});
test('M64 tampered adapter enable method fails closed',()=>{const changed=source.replace('=> enabled = false;', '=> enabled = explicitlyEnabledByOperator;');assert.equal(sourceSafety(changed).passed,false);assert.equal(assess(passed('Teacher'),passed('Student'),changed).reviewPassed,false)});
test('M64 removed pointer guard fails closed',()=>{const changed=source.replace('if (!enabled) return false;', '/* guard removed */');assert.equal(sourceSafety(changed).passed,false)});
test('M64 wrong roles and duplicate evidence fail closed',()=>{const t=passed('Teacher');t.observations.push({...t.observations[0]});assert.equal(assess(t,passed('Student'),source).reviewPassed,false);assert.equal(assess(passed('Student'),passed('Teacher'),source).reviewPassed,false)});
