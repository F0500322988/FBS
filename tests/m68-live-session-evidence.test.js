'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {STEPS,template,verify}=require('../windows/M68-Live-Session-Evidence');
const review={stage:'M67',reviewPassed:true,liveInputEnabled:false,readyForLiveInput:false};
function complete(){const x=template();x.sessionId='labtest-001';x.steps.forEach((s,i)=>{s.status='PASS';s.note='Observed manually on two PCs';s.observedAt=new Date(Date.UTC(2026,10,3,8,0,i)).toISOString();});return x;}
test('template contains 15 ordered role-specific observations',()=>{assert.equal(STEPS.length,15);assert.equal(template().steps.length,15);assert.ok(template().steps.every(s=>s.status==='NOT_TESTED'));});
test('valid self-reported sequence passes but never enables input',()=>{const x=verify(complete(),review);assert.equal(x.passed,true);assert.equal(x.liveInputEnabled,false);assert.equal(x.physicalTestSelfReported,true);});
test('unfilled template fails closed',()=>assert.equal(verify(template(),review).passed,false));
test('failed stop or denial fails closed',()=>{const x=complete();x.steps[8].status='FAIL';assert.equal(verify(x,review).passed,false);});
test('reordered observations rejected',()=>{const x=complete();[x.steps[3],x.steps[4]]=[x.steps[4],x.steps[3]];assert.equal(verify(x,review).passed,false);});
test('non-monotonic timestamps rejected',()=>{const x=complete();x.steps[6].observedAt=x.steps[5].observedAt;assert.equal(verify(x,review).passed,false);});
test('untrusted or missing M67 review rejected',()=>{assert.equal(verify(complete(),null).passed,false);assert.equal(verify(complete(),{...review,reviewPassed:false}).passed,false);});
test('unsafe review flags rejected',()=>assert.equal(verify(complete(),{...review,liveInputEnabled:true}).passed,false));
test('missing or invalid notes rejected',()=>{const x=complete();x.steps[0].note='ok';assert.equal(verify(x,review).passed,false);});
test('invalid session identifier rejected',()=>{const x=complete();x.sessionId='../unsafe';assert.equal(verify(x,review).passed,false);});
