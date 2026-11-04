'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {check}=require('../windows/M116-Managed-Control-Readiness');
const result=check();
for(const [name,ok] of Object.entries(result.checks)) test('M116 '+name,()=>assert.equal(ok,true));
test('M116 overall pass',()=>assert.equal(result.passed,true));
test('M116 must not claim enabled input',()=>assert.match(result.warning,/NOT working remote/));
