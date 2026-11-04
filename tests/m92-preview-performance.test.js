'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {percentile,evaluate,measure}=require('../windows/M92-Preview-Performance');
function fixture(n=5){return Array.from({length:5},(_,i)=>({now:100000+i*2000,latencyMs:40+i*10,status:{mode:'live',features:{remoteControl:false},students:Array.from({length:n},(_,j)=>({id:`s${j}`,online:true,approved:true}))},enrollment:{devices:Array.from({length:n},(_,j)=>({id:`s${j}`,approved:true}))},frames:{frames:Array.from({length:n},(_,j)=>({id:`s${j}`,at:100000+i*2000-100}))}}));}
test('healthy performance passes',()=>assert.equal(evaluate(fixture()).passed,true));
test('21 devices pass',()=>assert.equal(evaluate(fixture(21),{expected:21}).passed,true));
test('40 devices pass',()=>assert.equal(evaluate(fixture(40),{expected:40}).passed,true));
test('percentiles use nearest rank',()=>{assert.equal(percentile([1,2,3,4,5],95),5);assert.equal(percentile([],95),null);});
test('high latency fails',()=>{const x=fixture();x[4].latencyMs=2000;assert.ok(evaluate(x).issues.includes('high_p95_latency'));});
test('stopped updates fail',()=>{const x=fixture();for(let i=1;i<x.length;i++)for(const f of x[i].frames.frames)f.at=99900;assert.ok(evaluate(x).issues.includes('insufficient_continuous_updates'));});
test('missing device fails',()=>{const x=fixture();x[2].frames.frames.pop();assert.ok(evaluate(x).issues.includes('insufficient_previews_3'));});
test('unapproved frame fails',()=>{const x=fixture();x[1].status.students[0].approved=false;assert.ok(evaluate(x).issues.includes('unapproved_preview_2'));});
test('unsafe remote input fails',()=>{const x=fixture();x[0].status.features.remoteControl=true;assert.equal(evaluate(x).passed,false);});
test('duplicate frames fail',()=>{const x=fixture();x[0].frames.frames.push(x[0].frames.frames[0]);assert.ok(evaluate(x).issues.includes('duplicate_frame_1'));});
test('out of order samples fail',()=>{const x=fixture();x[2].now=x[1].now;assert.ok(evaluate(x).issues.includes('non_monotonic_sample_3'));});
test('report never includes student IDs or images',()=>{const r=JSON.stringify(evaluate(fixture()));assert.ok(!r.includes('s0'));assert.ok(!r.includes('jpeg'));});
test('invalid sample count fails',()=>assert.ok(evaluate(fixture().slice(0,2)).issues.includes('invalid_samples')));
test('invalid expected fails',()=>assert.ok(evaluate(fixture(),{expected:41}).issues.includes('invalid_expected')));
test('rejects invalid arguments before network',async()=>assert.rejects(measure({password:'x',expected:41}),/expected/));
