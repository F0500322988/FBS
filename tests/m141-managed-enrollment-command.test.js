const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root,'windows/FBS.Student.Native/ManagedEnrollmentCommandService.cs'),'utf8');
const smoke = fs.readFileSync(path.join(root,'windows/FBS.NativeSafety.Smoke/Program.cs'),'utf8');
const csproj = fs.readFileSync(path.join(root,'windows/FBS.NativeSafety.Smoke/FBS.NativeSafety.Smoke.csproj'),'utf8');
for(const [label,pattern] of [
 ['typed enrollment service',/sealed class ManagedEnrollmentCommandService/],
 ['no admin boolean in register',/Register\(string\? deviceId, byte\[\]\? subjectPublicKeyInfo, string\? administratorPassword/],
 ['admin verification for register',/administrator\.Provision\(deviceId!, subjectPublicKeyInfo!, administratorPassword, now\)/],
 ['admin verification for remove',/administrator\.Revoke\(deviceId!, administratorPassword, now\)/],
 ['RSA key parsing',/ImportSubjectPublicKeyInfo/],
 ['minimum RSA size',/rsa\.KeySize >= 2048/],
 ['bounded device IDs',/value\.Length > 64/],
 ['invalid ID rejected',/!ValidId\(deviceId\)/],
 ['invalid key rejected',/!ValidPublicKey\(subjectPublicKeyInfo\)/],
 ['lock around registration',/lock \(gate\)/],
 ['no remote input activation',/NOT an HTTP endpoint/],
]) test('M141 '+label,()=>assert.match(source,pattern));
test('M141 native smoke includes service',()=>assert.match(csproj,/ManagedEnrollmentCommandService.cs/));
test('M141 native smoke executes integration checks',()=>assert.match(smoke,/TestM141EnrollmentBoundary\(\)/));
test('M141 native smoke verifies revoked device',()=>assert.match(smoke,/M141 revoked ID cannot silently re-enroll/));
