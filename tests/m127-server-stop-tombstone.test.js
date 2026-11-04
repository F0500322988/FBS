'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../windows/FBS.Student.Native/Program.cs'), 'utf8');
const adapter = fs.readFileSync(path.join(__dirname, '../windows/FBS.Student.Native/WindowsInputAdapter.cs'), 'utf8');
test('server missing session tombstones old session before cleanup', () => {
  assert.match(source, /if \(currentSession is not null\)\s*\{\s*\/\/ A server-side stop[\s\S]*?locallyStoppedSession = currentSession;\s*RecordStoppedSession\(currentSession\);\s*localConsent\.Close\(currentSession\);\s*ClearPending\(\);/);
});
test('expired and revoked session cannot revive', () => {
  assert.match(source, /\/\/ Expired\/revoked sessions are never eligible for revival\.[\s\S]*?RecordStoppedSession\(id\);[\s\S]*?ClearPending\(\);/);
});
test('local stop disables adapter before HTTP notification', () => {
  const stop = source.slice(source.indexOf('private async void StopControl()'));
  assert.ok(stop.indexOf('ClearPending();') < stop.indexOf('await localClient.PostAsync('));
  assert.match(source, /private void ClearPending\(\) \{[^\n]*nativeInput\.Disable\(\)/);
});
test('native injection remains disabled by default', () => {
  assert.match(adapter, /EnableForVerifiedSession\(bool explicitlyEnabledByOperator\)\s*=> enabled = false;/);
});
test('incoming poll is invalidated after local stop', () => {
  assert.match(source, /if \(pollGeneration != stopRace\.Generation\) return;/);
});
