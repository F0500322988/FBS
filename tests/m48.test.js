'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {reviewPreflight,REQUIRED}=require('../single-device-preflight');
const {REQUIRED: R47}=require('../one-student-rehearsal');
const {REQUIRED: R46}=require('../readiness-evidence');
const now=Date.now();
function good(){const m46={stage:'M46',timestamp:new Date(now).toISOString(),realWindowsTwoPc:true};for(const k of R46)m46[k]='passed';const m47={stage:'M47',timestamp:new Date(now).toISOString(),platform:'Windows 11',studentCount:1,teacherHost:'teacher',studentHost:'student',observerConfirmed:true,nativeInputEnabled:false,m46Evidence:m46};for(const k of R47)m47[k]='passed';const r={stage:'M48',timestamp:new Date(now).toISOString(),platform:'Windows 11',studentCount:1,teacherHost:'teacher',studentHost:'student',operatorPresent:true,studentPresent:true,studentExplicitlyConsented:true,nativeInputEnabled:false,m47Evidence:m47};for(const k of REQUIRED)r[k]='passed';return r;}
test('complete preflight is review only, never enables native input',()=>{const x=reviewPreflight(good(),now);assert.equal(x.readyForSupervisedReview,true);assert.equal(x.inputEnabled,false);});
test('missing each physical check fails closed',()=>{for(const k of REQUIRED){const r=good();r[k]='not-run';assert.equal(reviewPreflight(r,now).readyForSupervisedReview,false,k);}});
test('human consent and single device mandatory',()=>{for(const mutate of [r=>r.operatorPresent=false,r=>r.studentPresent=false,r=>r.studentExplicitlyConsented=false,r=>r.studentCount=2,r=>r.nativeInputEnabled=true,r=>r.studentHost='teacher']){const r=good();mutate(r);assert.equal(reviewPreflight(r,now).readyForSupervisedReview,false);}});
test('cannot use stale, mismatched or incomplete rehearsal',()=>{for(const mutate of [r=>r.timestamp=new Date(now-7200000).toISOString(),r=>r.m47Evidence.studentStopObserved='not-run',r=>r.studentHost='different',r=>delete r.m47Evidence]){const r=good();mutate(r);assert.equal(reviewPreflight(r,now).readyForSupervisedReview,false);}});
test('invalid input is rejected',()=>{assert.equal(reviewPreflight(null,now).inputEnabled,false);assert.equal(reviewPreflight([],now).readyForSupervisedReview,false);});
