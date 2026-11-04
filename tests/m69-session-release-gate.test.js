'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {evaluate}=require('../windows/M69-Session-Release-Gate');
const {template}=require('../windows/M68-Live-Session-Evidence');
const source=fs.readFileSync(path.join(__dirname,'../windows/FBS.Student.Native/WindowsInputAdapter.cs'),'utf8');
const m67={stage:'M67',reviewPassed:true,liveInputEnabled:false,readyForLiveInput:false};
function evidence(){const e=template();e.sessionId='lab-session-001';e.steps.forEach((s,i)=>{s.status='PASS';s.note='Observed manually on lab devices';s.observedAt=new Date(Date.UTC(2026,10,3,9,0,i)).toISOString();});return e;}
test('valid evidence and native safety pass preview-only review',()=>{const r=evaluate(evidence(),m67,source);assert.equal(r.passed,true);assert.equal(r.liveInputEnabled,false);assert.equal(r.approvedForLiveInput,false);assert.match(r.sourceSha256,/^[0-9a-f]{64}$/);});
test('unfilled evidence fails closed',()=>assert.equal(evaluate(template(),m67,source).passed,false));
test('failed student stop fails closed',()=>{const e=evidence();e.steps[6].status='FAIL';assert.equal(evaluate(e,m67,source).passed,false);});
test('reused consent after reconnect fails closed',()=>{const e=evidence();e.steps[11].status='NOT_TESTED';assert.equal(evaluate(e,m67,source).passed,false);});
test('missing prior review fails closed',()=>assert.equal(evaluate(evidence(),null,source).passed,false));
test('unsafe prior review fails closed',()=>assert.equal(evaluate(evidence(),{...m67,readyForLiveInput:true},source).passed,false));
test('tampered native source fails isolation',()=>assert.equal(evaluate(evidence(),m67,'public class Fake {}').passed,false));
test('report never authorizes input even when passed',()=>{const r=evaluate(evidence(),m67,source);assert.equal(r.readyForLiveInput,false);assert.equal(r.approvedForLiveInput,false);assert.equal(r.scope,'one-student-preview-only');});
