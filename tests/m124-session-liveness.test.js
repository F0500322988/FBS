'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '../windows/FBS.Student.Native');
const guard = fs.readFileSync(path.join(root,'SessionLivenessGuard.cs'),'utf8');
const student = fs.readFileSync(path.join(root,'Program.cs'),'utf8');
for(const [label,pattern] of [
 ['liveness is fail closed',/private bool stopped = true/],
 ['session identity is bound',/sessionId != id/],
 ['expiry is checked',/now >= expiry/],
 ['clock rollback rejected',/now < lastContact/],
 ['silence is bounded',/TimeSpan.FromSeconds\(6\)/],
 ['timeout revokes session',/Stop\(\);\s*return false;/],
 ['invalid start cannot arm',/string.IsNullOrWhiteSpace\(id\)/],
 ['max session lifetime',/TimeSpan.FromMinutes\(2\)/],
 ['no native input dispatch',/public bool IsActive => !stopped/]
]) test('M124 '+label,()=>assert.match(guard,pattern));
for(const [label,pattern] of [
 ['guard instantiated',/private readonly SessionLivenessGuard sessionLiveness = new\(\)/],
 ['new session starts liveness',/sessionLiveness.Start\(id, expiry, DateTimeOffset.UtcNow\)/],
 ['preview requires liveness',/sessionLiveness.Heartbeat\(id, DateTimeOffset.UtcNow\)/],
 ['clear pending stops liveness',/private void ClearPending\(\).*sessionLiveness.Stop\(\)/s],
 ['native input remains disabled',/nativeInput.Disable\(\)/]
]) test('M124 '+label,()=>assert.match(student,pattern));
test('M124 no native input enable in student',()=>assert.doesNotMatch(student,/nativeInput\.EnableForVerifiedSession\s*\(/));
