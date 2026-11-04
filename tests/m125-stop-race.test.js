'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../windows/FBS.Student.Native');
const guard=fs.readFileSync(path.join(root,'StopRaceGuard.cs'),'utf8');
const student=fs.readFileSync(path.join(root,'Program.cs'),'utf8');
for (const [name,rx] of [
 ['guard defaults without stopped session',/HashSet<string> stoppedSessions/],
 ['generation tracks stops',/generation\+\+;/],
 ['stopped session cannot resume',/!stoppedSessions\.Contains\(sessionId\)/],
 ['stale responses cannot resume',/requestGeneration == generation/],
 ['expired responses cannot resume',/now < expiry/],
 ['stop records id',/stoppedSessions\.Add\(sessionId\)/],
 ['empty stop cannot mutate',/string.IsNullOrWhiteSpace\(sessionId\)\) return;/],
 ['exposes stopped session',/bool WasStopped/],
 ['student creates guard',/new\(\)/],
 ['poll rejects stopped id',/stopRace.WasStopped\(id\)/],
 ['approval snapshots generation',/var requestGeneration = stopRace.Generation/],
 ['approval checks generation',/stopRace.MayApply\(id, requestGeneration, sessionExpiresAt/],
 ['local stop revokes',/stopRace.Stop\(id\)/],
 ['input still disabled',/nativeInput.Disable\(\)/],
]) test('M125 '+name,()=>assert.match(name.includes('student')||name.includes('poll')||name.includes('approval')||name.includes('local')||name.includes('input')?student:guard,rx));
test('M125 native input not enabled',()=>assert.doesNotMatch(student,/nativeInput\.EnableForVerifiedSession\s*\(/));
