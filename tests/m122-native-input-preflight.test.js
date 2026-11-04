'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'../windows/FBS.Student.Native/NativeInputPreflight.cs'),'utf8');
const student = fs.readFileSync(path.join(__dirname,'../windows/FBS.Student.Native/Program.cs'),'utf8');
const adapter = fs.readFileSync(path.join(__dirname,'../windows/FBS.Student.Native/WindowsInputAdapter.cs'),'utf8');
const checks = [
 ['session must be nonblank', /IsNullOrWhiteSpace\(sessionId\)/],
 ['enrollment required', /!deviceEnrolled/],
 ['teacher authentication required', /!teacherAuthenticated/],
 ['local agent authentication required', /!localAgentAuthenticated/],
 ['visible indicator required', /!indicatorVisible/],
 ['operator authorization required', /!operatorAuthorized/],
 ['expiry enforced', /now >= expiry/],
 ['disconnect revokes', /!agentConnected/],
 ['student stop revokes', /localStopRequested/],
 ['session binding', /StringComparison\.Ordinal/],
 ['payload validation', /PreviewPayloadPolicy\.Valid/],
 ['replay rejected', /sequence <= lastSequence/],
 ['dry run only', /accepted-dry-run-only/],
 ['native input disabled', /NativeInputEnabled => false/],
];
for(const [name,pattern] of checks) test('M122 '+name,()=>assert.match(source,pattern));
test('M122 no OS input API in preflight',()=>assert.doesNotMatch(source,/SendInput\s*\(|MovePointer\s*\(|TapLetter\s*\(/));
test('M122 existing adapter remains disabled',()=>assert.match(adapter,/EnableForVerifiedSession\(bool explicitlyEnabledByOperator\)\s*=> enabled = false/));
test('M122 student still disables adapter on stop',()=>assert.match(student,/ClearPending\(\).*?nativeInput\.Disable\(\)/s));
