const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = fs.readFileSync('windows/Test-M44-Two-PC.ps1','utf8');
test('M44 has separate teacher and student roles',()=>{ assert.match(p,/ValidateSet\('Teacher','Student'\)/); assert.match(p,/TeacherIP/); });
test('M44 TLS identity is fail closed',()=>{ assert.match(p,/ExpectedCertSha256/); assert.match(p,/fingerprint MISMATCH/); assert.match(p,/tls-identity' 'FAIL'/); });
test('M44 report cannot assert live input readiness',()=>{ assert.match(p,/readyForLiveInput=\$false/); assert.match(p,/requiresManualVerification/); });
test('M44 does not change Windows firewall',()=>{ assert.doesNotMatch(p,/New-NetFirewallRule|Set-NetFirewallRule|netsh advfirewall/i); });
