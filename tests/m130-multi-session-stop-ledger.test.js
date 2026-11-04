const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const guard = read('windows/FBS.Student.Native/StopRaceGuard.cs');
const runtime = read('windows/FBS.NativeSafety.Smoke/Program.cs');
const app = read('windows/FBS.Student.Native/Program.cs');
const adapter = read('windows/FBS.Student.Native/WindowsInputAdapter.cs');
test('M130 retains all stopped sessions instead of last one only', () => {
  assert.match(guard, /HashSet<string> stoppedSessions/);
  assert.match(guard, /stoppedSessions\.Add\(sessionId\)/);
  assert.match(guard, /stoppedSessions\.Contains\(sessionId\)/);
});
test('M130 ledger is bounded and fails closed rather than evicting stops', () => {
  assert.match(guard, /MaxStoppedSessions = 4096/);
  assert.match(guard, /exhausted = true/);
  assert.match(guard, /!exhausted &&/);
  assert.match(guard, /=> exhausted \|\|/);
});
test('M130 stop increments generation for pending network polls', () => {
  assert.match(guard, /generation\+\+/);
  assert.match(guard, /requestGeneration == generation/);
});
test('M130 Windows smoke tests stopping two different sessions', () => {
  assert.match(runtime, /guard\.Stop\("session-second"\)/);
  assert.match(runtime, /first stop persists after second stop/);
  assert.match(runtime, /first stopped session cannot revive/);
  assert.match(runtime, /second stopped session cannot revive/);
});
test('M130 Windows smoke tests late replies and fresh sessions', () => {
  assert.match(runtime, /in-flight poll invalidated by second stop/);
  assert.match(runtime, /fresh distinct session remains eligible/);
  assert.match(runtime, /repeat stop cannot revive session/);
});
test('M130 app checks stopped-session ledger on incoming poll', () => {
  assert.match(app, /stopRace\.WasStopped\(id\)/);
  assert.match(app, /pollGeneration != stopRace\.Generation/);
});
test('M130 native input remains disabled', () => {
  assert.match(adapter, /EnableForVerifiedSession\(bool explicitlyEnabledByOperator\)\s*=> enabled = false/);
});
