'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const student = fs.readFileSync(path.join(__dirname,'../windows/FBS.Student.Native/Program.cs'),'utf8');
const preflight = fs.readFileSync(path.join(__dirname,'../windows/FBS.Student.Native/NativeInputPreflight.cs'),'utf8');
const checks = [
 ['preflight instance on student form',/private readonly NativeInputPreflight nativePreflight = new\(\)/],
 ['preflight arms only after approved preview state',/if \(state == "consented-no-input"\)[\s\S]*?nativePreflight\.Begin\(/],
 ['preflight requires current local consent',/deviceEnrolled: localConsent\.CanPreview\(id\)/],
 ['preflight checks recent agent contact',/localAgentAuthenticated: lastAgentContact > DateTimeOffset\.UtcNow\.AddSeconds\(-6\)/],
 ['preflight requires visible banner',/indicatorVisible: sessionBanner\.Visible/],
 ['preflight evaluates received commands',/nativePreflight\.Evaluate\(item, id, DateTimeOffset\.UtcNow/],
 ['rejected preflight never updates accepted preview',/if \(nativeDecision != "accepted-dry-run-only"\) continue/],
 ['preflight revoked on new session',/executionGuard\.Stop\(\); commandChannel\.Revoke\(\); nativePreflight\.Stop\(\)/],
 ['preflight revoked when not consented',/commandChannel\.Revoke\(\);\s*nativePreflight\.Stop\(\)/],
 ['preflight revoked on clear pending',/private void ClearPending\(\).*?nativePreflight\.Stop\(\)/s],
 ['preflight reports inactive until begun',/public bool IsActive => !stopped && activeSession is not null/],
 ['native adapter remains disabled',/nativeInput\.Disable\(\)/],
 ['preflight still dry run only',/public bool NativeInputEnabled => false/],
 ['no OS input injection from polling path',/if \(nativeDecision != "accepted-dry-run-only"\) continue/]
];
for (const [name,regex] of checks) test('M123 '+name,()=>assert.match(name.includes('inactive')||name.includes('dry run')?preflight:student,regex));
test('M123 no native input enable call in student form',()=>assert.doesNotMatch(student,/nativeInput\.EnableForVerifiedSession\s*\(/));
