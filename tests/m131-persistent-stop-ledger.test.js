const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const ledger = fs.readFileSync(path.join(root, 'windows/FBS.Student.Native/PersistentStopLedger.cs'), 'utf8');
const app = fs.readFileSync(path.join(root, 'windows/FBS.Student.Native/Program.cs'), 'utf8');

test('restart ledger reads existing persisted tombstones', () => {
  assert.match(ledger, /File\.ReadAllText\(path\)/);
  assert.match(ledger, /JsonSerializer\.Deserialize<string\[\]>/);
});
test('corrupt ledger fails closed', () => assert.match(ledger, /catch \(Exception\) \{ LockedDown = true; \}/));
test('writes through temporary file before replacement', () => {
  assert.match(ledger, /File\.WriteAllText\(temporary/);
  assert.match(ledger, /File\.Move\(temporary, path, overwrite: true\)/);
});
test('full ledger fails closed without tombstone eviction', () => assert.match(ledger, /stopped\.Count >= MaxEntries\) \{ LockedDown = true/));
test('student application stores ledger under local app data', () => assert.match(app, /SpecialFolder\.LocalApplicationData/));
test('student polling rejects previously stopped sessions after restart', () => assert.match(app, /persistentStops\.WasStopped\(id\) \|\| stopRace\.WasStopped\(id\)/));
test('student polling fails closed on persistent ledger fault', () => assert.match(app, /if \(polling \|\| IsDisposed \|\| persistentStops\.LockedDown\) return/));
test('every stop recording persists alongside runtime stop guard', () => {
  assert.match(app, /private void RecordStoppedSession\(string\? id\)[\s\S]*?stopRace\.Stop\(id\);[\s\S]*?persistentStops\.Stop\(id\);/);
  assert.equal((app.match(/stopRace\.Stop\(/g) || []).length, 1);
});
