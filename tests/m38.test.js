const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
test('M38 native gate tombstones stopped session IDs', () => {
  const source = fs.readFileSync(path.join(root, 'windows/FBS.Student.Native/ControlInputGate.cs'), 'utf8');
  assert.match(source, /closedSessions\.Add\(activeSession\)/);
  assert.match(source, /closedSessions\.Contains\(sessionId\)/);
  assert.match(source, /public bool InputEnabled => false/);
});
test('M38 local test kit includes native simulation and fails on missing SDK', () => {
  const script = fs.readFileSync(path.join(root, 'windows/Test-M38-One-Student.ps1'), 'utf8');
  assert.match(script, /FBS\.NativeGate\.Tests/);
  assert.match(script, /Get-Command dotnet/);
  assert.match(script, /if \(-not \$results\.passed\) \{ exit 1 \}/);
});
