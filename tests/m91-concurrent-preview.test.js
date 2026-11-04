'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const {evaluate,collect}=require('../windows/M91-Concurrent-Preview-Load');
const now=100000;
function fixture(n=5){return Array.from({length:4},(_,i)=>({now:now+i*2000,latencyMs:30,status:{mode:'live',features:{remoteControl:false},students:Array.from({length:n},(_,j)=>({id:`s${j}`,online:true,approved:true}))},enrollment:{devices:Array.from({length:n},(_,j)=>({id:`s${j}`,approved:true}))},frames:{frames:Array.from({length:n},(_,j)=>({id:`s${j}`,at:now+i*2000-100}))}}));}
test('healthy concurrent samples pass',()=>assert.equal(evaluate(fixture()).passed,true));
test('21 students pass',()=>assert.equal(evaluate(fixture(21),{expected:21}).passed,true));
test('40 students pass',()=>assert.equal(evaluate(fixture(40),{expected:40}).passed,true));
test('missing previews fail',()=>{const x=fixture();x[2].frames.frames.pop();assert.ok(evaluate(x).issues.includes('insufficient_previews_3'));});
test('stale preview fails',()=>{const x=fixture();x[2].frames.frames[0].at=1;assert.ok(evaluate(x).issues.includes('stale_preview_3'));});
test('unapproved preview fails',()=>{const x=fixture();x[1].status.students[0].approved=false;assert.ok(evaluate(x).issues.includes('unapproved_preview_2'));});
test('remote control enabled fails closed',()=>{const x=fixture();x[1].status.features.remoteControl=true;assert.equal(evaluate(x).passed,false);});
test('duplicate frame fails',()=>{const x=fixture();x[1].frames.frames.push(x[1].frames.frames[0]);assert.ok(evaluate(x).issues.includes('duplicate_frame_2'));});
test('no frame progression fails',()=>{const x=fixture();for(let i=1;i<x.length;i++)for(const f of x[i].frames.frames)f.at=now-100;assert.ok(evaluate(x).issues.includes('insufficient_independent_frame_progress'));});
test('invalid expected fails',()=>assert.ok(evaluate(fixture(),{expected:41}).issues.includes('invalid_expected')));
test('insufficient samples fails',()=>assert.ok(evaluate(fixture().slice(0,2)).issues.includes('invalid_sample_count')));
test('invalid latency fails',()=>{const x=fixture();x[0].latencyMs=-1;assert.equal(evaluate(x).passed,false);});
test('report excludes IDs and JPEGs',()=>{const r=JSON.stringify(evaluate(fixture()));assert.ok(!r.includes('s0'));assert.ok(!r.includes('jpeg'));});
test('collect rejects invalid inputs before network',async()=>assert.rejects(collect({password:'x',expected:41}),/expected/));
