'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createControlLeases}=require('../control-lease');
test('control request is unique, expires, and cannot be acknowledged twice',()=>{
 let now=1000;const l=createControlLeases({clock:()=>now,ttl:100});
 const a=l.request('PC-01');assert.ok(a.sessionId);assert.equal(l.request('PC-01'),null);
 assert.equal(l.acknowledge('PC-01','wrong',true),false);
 assert.equal(l.acknowledge('PC-01',a.sessionId,true),true);
 assert.equal(l.pending('PC-01').status,'consented-no-input');
 assert.equal(l.acknowledge('PC-01',a.sessionId,true),false);
 now+=16000;assert.equal(l.pending('PC-01'),null);
});
test('control requests can be cancelled and stale requests rejected',()=>{
 let now=100;const l=createControlLeases({clock:()=>now,ttl:60});const a=l.request('PC-02');
 assert.equal(l.cancel('PC-02'),true);assert.equal(l.acknowledge('PC-02',a.sessionId,true),false);
 const b=l.request('PC-02');now+=61;assert.equal(l.acknowledge('PC-02',b.sessionId,true),false);
});
