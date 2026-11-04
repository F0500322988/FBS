const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.join(__dirname, '..', 'windows');
const auth = fs.readFileSync(path.join(base, 'FBS.Student.Native', 'AuthenticatedEnrollmentService.cs'), 'utf8');
const smoke = fs.readFileSync(path.join(base, 'FBS.NativeSafety.Smoke', 'Program.cs'), 'utf8');
for (const [name, pattern] of [
 ['durable state constructor', /string lockoutPath, byte\[\] lockoutKey/],
 ['authenticated encryption', /new AesGcm\(lockoutKey!, 16\)/],
 ['persistent failure count', /WriteInt32LittleEndian\(plain, failures\)/],
 ['persistent expiry', /WriteInt64LittleEndian/],
 ['reload state', /LoadState\(\)/],
 ['tamper detection', /aes\.Decrypt/],
 ['atomic replacement', /File\.Move\(temp, lockoutPath, true\)/],
 ['fail closed', /lockedDown = true/],
 ['deny when locked', /if \(lockedDown \|\| enrollment\.IsLocked/],
 ['persist failed attempts', /PersistOrLock\(\);\s*return false;/],
 ['Windows smoke test', /TestM139DurableLockout\(\)/],
 ['restart regression', /M139 lockout survives restart/],
 ['corrupt state regression', /M139 corrupt state fails closed/],
]) test('M139 '+name, () => assert.match(name.includes('regression') || name === 'Windows smoke test' ? smoke : auth, pattern));
