'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {reviewRehearsal,REQUIRED} = require('../one-student-rehearsal');
const {REQUIRED: BASE} = require('../readiness-evidence');
const now = Date.now();
function good() {
 const m46={stage:'M46',timestamp:new Date(now).toISOString(),realWindowsTwoPc:true};
 for(const key of BASE)m46[key]='passed';
 const r={stage:'M47',timestamp:new Date(now).toISOString(),platform:'Windows 11',studentCount:1,teacherHost:'teacher',studentHost:'student',observerConfirmed:true,nativeInputEnabled:false,m46Evidence:m46};
 for(const key of REQUIRED)r[key]='passed';return r;
}
test('complete one-student report is review-ready without enabling input',()=>{const r=reviewRehearsal(good(),now);assert.equal(r.ready,true);assert.match(r.note,/Never enables/);});
test('no unobserved steps can be silently accepted',()=>{for(const k of REQUIRED){const r=good();r[k]='not-run';assert.equal(reviewRehearsal(r,now).ready,false,k);}});
test('reject two students, same hosts, missing observer and input enabled',()=>{for(const change of [r=>r.studentCount=2,r=>r.studentHost='teacher',r=>r.observerConfirmed=false,r=>r.nativeInputEnabled=true]){const r=good();change(r);assert.equal(reviewRehearsal(r,now).ready,false);}});
test('reject stale, future, or incomplete M46 evidence',()=>{for(const change of [r=>r.timestamp=new Date(now-2*86400000).toISOString(),r=>r.timestamp=new Date(now+200000).toISOString(),r=>r.m46Evidence.studentStopObserved='not-run',r=>delete r.m46Evidence]){const r=good();change(r);assert.equal(reviewRehearsal(r,now).ready,false);}});
test('reject wrong stage, platform and invalid report',()=>{for(const change of [r=>r.stage='M46',r=>r.platform='macOS']){const r=good();change(r);assert.equal(reviewRehearsal(r,now).ready,false);}assert.equal(reviewRehearsal(null,now).ready,false);});
