'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {template,evaluate}=require('../windows/M70-Stop-Response-Evidence');
const prior={stage:'M69',passed:true,liveInputEnabled:false,readyForLiveInput:false,approvedForLiveInput:false};
function filled(){const e=template();e.sessionId='lab-session-001';e.observations.forEach((o,i)=>{o.status='PASS';o.studentNote='Observed student display';o.teacherNote='Observed teacher display';o.triggerAt=new Date(Date.UTC(2026,10,3,9,i,0)).toISOString();o.confirmedAt=new Date(Date.UTC(2026,10,3,9,i,2)).toISOString();});return e;}
test('template is fail-closed',()=>assert.equal(evaluate(template(),prior).passed,false));
test('complete self-reported preview-only evidence passes',()=>{const r=evaluate(filled(),prior);assert.equal(r.passed,true);assert.equal(r.liveInputEnabled,false);assert.equal(r.approvedForLiveInput,false);assert.equal(r.observedIntervals.length,4);});
test('missing M69 evidence fails',()=>assert.equal(evaluate(filled(),null).passed,false));
test('unsafe M69 input approval fails',()=>assert.equal(evaluate(filled(),{...prior,approvedForLiveInput:true}).passed,false));
test('student stop failure fails',()=>{const e=filled();e.observations[0].status='FAIL';assert.equal(evaluate(e,prior).passed,false);});
test('out of order scenario fails',()=>{const e=filled();e.observations.reverse();assert.equal(evaluate(e,prior).passed,false);});
test('negative elapsed time fails',()=>{const e=filled();e.observations[0].confirmedAt='2026-11-03T08:59:59Z';assert.equal(evaluate(e,prior).passed,false);});
test('excessive observed interval fails',()=>{const e=filled();e.observations[0].confirmedAt='2026-11-03T09:00:31Z';assert.equal(evaluate(e,prior).passed,false);});
test('invalid timestamp fails',()=>{const e=filled();e.observations[0].triggerAt='yesterday';assert.equal(evaluate(e,prior).passed,false);});
test('missing human observations fail',()=>{const e=filled();e.observations[0].teacherNote='';assert.equal(evaluate(e,prior).passed,false);});
test('missing scenario fails',()=>{const e=filled();e.observations.pop();assert.equal(evaluate(e,prior).passed,false);});
