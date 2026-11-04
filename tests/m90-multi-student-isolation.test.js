'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const {evaluate,collect}=require('../windows/M90-Multi-Student-Isolation');
const ids=['a','b'];const t=100000;
function snap(approved=[],frames={}){return {status:{mode:'live',features:{remoteControl:false},students:ids.map(id=>({id,online:true,approved:approved.includes(id)}))},frames:{frames:ids.filter(id=>frames[id]).map(id=>({id,at:frames[id]}))}};}
function fixture(){return {baseline:snap(),targets:ids,cycles:[{consentAt:t,active:snap(['a'],{a:t+10}),stopAt:t+20,stopped:snap([])},{consentAt:t+10000,active:snap(['b'],{b:t+10010}),stopAt:t+10020,stopped:snap([])}]};}
test('valid sequential independent consents pass',()=>assert.equal(evaluate(fixture()).passed,true));
test('reject duplicate student IDs',()=>assert.ok(evaluate({...fixture(),targets:['a','a']}).issues.includes('invalid_targets')));
test('reject only one student',()=>assert.equal(evaluate({...fixture(),targets:['a']}).passed,false));
test('reject unsafe remote control mode',()=>{const f=fixture();f.baseline.status.features.remoteControl=true;assert.equal(evaluate(f).passed,false);});
test('reject consent already on at baseline',()=>{const f=fixture();f.baseline=snap(['a']);assert.ok(evaluate(f).issues.includes('target_consent_not_off_at_baseline'));});
test('reject missing active consent',()=>{const f=fixture();f.cycles[0].active=snap([],{a:t+10});assert.ok(evaluate(f).issues.includes('consent_not_active_1'));});
test('reject missing fresh preview',()=>{const f=fixture();f.cycles[0].active=snap(['a']);assert.ok(evaluate(f).issues.includes('fresh_preview_missing_1'));});
test('reject other student consent change',()=>{const f=fixture();f.cycles[0].active=snap(['a','b'],{a:t+10});assert.ok(evaluate(f).issues.includes('other_consent_changed_1'));});
test('reject other student preview update',()=>{const f=fixture();f.cycles[0].active=snap(['a'],{a:t+10,b:t+10});assert.ok(evaluate(f).issues.includes('other_preview_updated_1'));});
test('reject active approval after stop',()=>{const f=fixture();f.cycles[0].stopped=snap(['a']);assert.ok(evaluate(f).issues.includes('approval_persisted_after_stop_1'));});
test('reject preview update after grace',()=>{const f=fixture();f.cycles[0].stopped=snap([],{a:t+20+6001});assert.ok(evaluate(f).issues.includes('preview_after_stop_1'));});
test('reject invalid event ordering',()=>{const f=fixture();f.cycles[0].stopAt=t;assert.ok(evaluate(f).issues.includes('invalid_event_order_1'));});
test('reject invalid grace interval',()=>assert.ok(evaluate({...fixture(),graceMs:0}).issues.includes('invalid_grace')));
test('reject malformed samples',()=>{const f=fixture();f.cycles[1].active=null;assert.ok(evaluate(f).issues.includes('invalid_samples_or_unsafe_mode'));});
test('collect rejects invalid inputs before network call',async()=>await assert.rejects(collect({targets:['a','a'],password:'x'}),/unique/));
test('prior stopped student may retain historical frame metadata',()=>{const f=fixture();f.cycles[0].stopped=snap([],{a:t+10});f.cycles[1].active=snap(['b'],{a:t+10,b:t+10010});f.cycles[1].stopped=snap([],{a:t+10});assert.equal(evaluate(f).passed,true);});
test('prior stopped student must not produce newer frame',()=>{const f=fixture();f.cycles[0].stopped=snap([],{a:t+10});f.cycles[1].active=snap(['b'],{a:t+10001,b:t+10010});assert.ok(evaluate(f).issues.includes('other_preview_updated_2'));});
