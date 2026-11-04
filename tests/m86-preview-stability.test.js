'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {evaluate}=require('../windows/M86-Preview-Stability');
const frame=(at,id='s1')=>({id,at,jpeg:'/9j/AAAAAAAAAAAAAAAAAAAA'});
function sample(now,at=now,id='s1') {return {now,status:{mode:'live',features:{remoteControl:false},students:[{id,online:true,approved:true}]},enrollment:{devices:[{id,approved:true}]},frames:{frames:[frame(at,id)]}};}
test('progressing preview passes',()=>{const r=evaluate([sample(10000,9500),sample(12000,11500)]);assert.equal(r.passed,true);assert.equal(r.frameAdvances,1);});
test('unchanged frame rejected',()=>assert.ok(evaluate([sample(10000,9500),sample(12000,9500)]).issues.includes('no_sufficient_frame_progress')));
test('old frames rejected',()=>assert.ok(evaluate([sample(10000,10000),sample(20000,10000)]).issues.includes('sample_1_invalid')));
test('requires multiple samples',()=>assert.ok(evaluate([sample(10000)]).issues.includes('insufficient_samples')));
test('no samples rejected',()=>assert.equal(evaluate([]).passed,false));
test('remote input enabled rejected',()=>{const a=sample(10000),b=sample(12000);b.status.features.remoteControl=true;assert.equal(evaluate([a,b]).passed,false);});
test('unapproved student rejected',()=>{const a=sample(10000),b=sample(12000);b.status.students[0].approved=false;assert.equal(evaluate([a,b]).passed,false);});
test('invalid capacity rejected',()=>assert.ok(evaluate([sample(10000),sample(12000)],{expected:41}).issues.includes('invalid_expected')));
test('report excludes IDs and JPEG data',()=>{const r=evaluate([sample(10000),sample(12000)]);assert.ok(!JSON.stringify(r).includes('s1'));assert.ok(!JSON.stringify(r).includes('/9j/'));});
test('missing frame rejected',()=>{const a=sample(10000),b=sample(12000);b.frames.frames=[];assert.equal(evaluate([a,b]).passed,false);});
