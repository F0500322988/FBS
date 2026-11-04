'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {evaluate,REQUIRED}=require('../windows/M95-Pilot-Rollout');
const m94={stage:'M94',passed:true,remoteInputEnabled:false};
function device(id,role){return {id,role,...Object.fromEntries(REQUIRED.map(k=>[k,true]))};}
function pilot(){return {operatorApproved:true,remoteInputEnabled:false,devices:[device('t','Teacher'),device('s1','Student'),device('s2','Student')]};}
test('valid pilot passes',()=>assert.equal(evaluate(m94,pilot()).passed,true));
test('M94 failure blocks',()=>assert.ok(evaluate({...m94,passed:false},pilot()).issues.includes('m94_not_approved')));
test('M94 remote input blocks',()=>assert.equal(evaluate({...m94,remoteInputEnabled:true},pilot()).passed,false));
test('operator approval required',()=>assert.equal(evaluate(m94,{...pilot(),operatorApproved:false}).passed,false));
test('remote input must be disabled',()=>assert.equal(evaluate(m94,{...pilot(),remoteInputEnabled:true}).passed,false));
test('two devices insufficient',()=>{let p=pilot();p.devices.pop();assert.equal(evaluate(m94,p).passed,false)});
test('more than five students fails',()=>{let p=pilot();for(let i=3;i<=6;i++)p.devices.push(device('s'+i,'Student'));assert.equal(evaluate(m94,p).passed,false)});
test('duplicate ID fails',()=>{let p=pilot();p.devices[2].id='s1';assert.equal(evaluate(m94,p).passed,false)});
test('invalid ID fails',()=>{let p=pilot();p.devices[1].id='secret user@example.com';assert.equal(evaluate(m94,p).passed,false)});
test('missing verification fails',()=>{let p=pilot();p.devices[1].stop_verified=false;assert.equal(evaluate(m94,p).passed,false)});
test('extra teacher fails',()=>{let p=pilot();p.devices[2].role='Teacher';assert.equal(evaluate(m94,p).passed,false)});
test('summary does not leak identifiers',()=>{let p=pilot();p.devices[1].id='PRIVATE123';assert.equal(JSON.stringify(evaluate(m94,p)).includes('PRIVATE123'),false)});
