'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '../windows/FBS.Student.Native');
const guard = fs.readFileSync(path.join(root, 'PollResponseGuard.cs'), 'utf8');
const app = fs.readFileSync(path.join(root, 'Program.cs'), 'utf8');
for (const [name, source, regex] of [
  ['generation mismatch fails closed',guard,/requestGeneration != currentGeneration\) return false/],
  ['stopped session rejected',guard,/incomingSession == stoppedSession\) return false/],
  ['expired response rejected',guard,/incomingExpiry > now/],
  ['blank session safely clears state',guard,/string\.IsNullOrWhiteSpace\(incomingSession\)\) return true/],
  ['poll snapshots generation',app,/var pollGeneration = stopRace\.Generation/],
  ['poll checks generation after await',app,/if \(pollGeneration != stopRace\.Generation\) return;/],
  ['poll invokes guard',app,/PollResponseGuard\.MayApply\(pollGeneration, stopRace\.Generation/],
  ['poll checks guard before session expiry update',app,/PollResponseGuard\.MayApply[\s\S]*?\)\) return;\s*sessionExpiresAt = expiry/],
  ['stop still revokes session',app,/stopRace\.Stop\(id\)/],
  ['native input remains disabled',app,/nativeInput\.Disable\(\)/],
]) test('M126 '+name,()=>assert.match(source,regex));
test('M126 native injection cannot be enabled from student UI',()=>assert.doesNotMatch(app,/nativeInput\.EnableForVerifiedSession\s*\(/));
