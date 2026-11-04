'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {rehearse,SCENARIOS}=require('../windows/M65-Session-Rehearsal');
test('preview requires explicit consent',()=>{const r=rehearse(['connect','preview','consent','preview']);assert.equal(r.trace[1].accepted,false);assert.equal(r.trace[3].accepted,true);});
test('stop immediately revokes preview and consent',()=>{const r=rehearse(SCENARIOS['consent-preview-stop']);assert.equal(r.trace[4].preview,false);assert.equal(r.trace[5].accepted,false);});
test('disconnect and reconnect require new consent',()=>{const r=rehearse(SCENARIOS['disconnect-reconsent']);assert.equal(r.trace[5].accepted,false);assert.equal(r.trace[7].accepted,true);});
test('timeout revokes preview',()=>{const r=rehearse(SCENARIOS.timeout);assert.equal(r.trace[3].preview,false);assert.equal(r.trace[4].accepted,false);});
test('input never accepted even after consent',()=>{for(const events of Object.values(SCENARIOS)){const r=rehearse(events);assert.equal(r.passed,true);assert.equal(r.liveInputEnabled,false);assert.ok(r.trace.filter(x=>x.event==='input').every(x=>!x.accepted));}});
test('rejects malformed and oversized event lists',()=>{assert.throws(()=>rehearse(['unknown']));assert.throws(()=>rehearse(Array(101).fill('connect')));});
