'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {review}=require('../windows/M71-Stop-Review');
const {template,evaluate}=require('../windows/M70-Stop-Response-Evidence');
const source=fs.readFileSync(path.join(__dirname,'../windows/FBS.Student.Native/WindowsInputAdapter.cs'),'utf8');
const prior={stage:'M69',passed:true,liveInputEnabled:false,readyForLiveInput:false,approvedForLiveInput:false};
function fixture(){const e=template();e.sessionId='session_123';let time=Date.parse('2026-11-03T08:00:00Z');for(const o of e.observations){o.status='PASS';o.triggerAt=new Date(time).toISOString();o.confirmedAt=new Date(time+1500).toISOString();o.studentNote='Student confirmed stop';o.teacherNote='Teacher preview stopped';time+=5000;}return e;}
test('M71 accepts consistent M70 observations but never enables input',()=>{const e=fixture(),r=review(e,prior,evaluate(e,prior),source);assert.equal(r.passed,true);assert.equal(r.liveInputEnabled,false);assert.equal(r.readyForLiveInput,false)});
test('M71 rejects forged intervals',()=>{const e=fixture(),s=evaluate(e,prior);s.observedIntervals[0].observedMilliseconds=1;assert.equal(review(e,prior,s,source).passed,false)});
test('M71 rejects failed field observations',()=>{const e=fixture();e.observations[0].status='FAIL';assert.equal(review(e,prior,evaluate(e,prior),source).passed,false)});
test('M71 rejects enabling native input',()=>{const e=fixture();const modified=source.replace('EnableForVerifiedSession(bool explicitlyEnabledByOperator)\n        => enabled = false;', 'EnableForVerifiedSession(bool explicitlyEnabledByOperator)\n        => enabled = true;');assert.equal(review(e,prior,evaluate(e,prior),modified).passed,false)});
test('M71 rejects unsafe prior report',()=>{const e=fixture();assert.equal(review(e,{...prior,liveInputEnabled:true},evaluate(e,prior),source).passed,false)});
test('M71 rejects claims of live input approval',()=>{const e=fixture(),s=evaluate(e,prior);s.approvedForLiveInput=true;assert.equal(review(e,prior,s,source).passed,false)});
