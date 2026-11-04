const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
test('M37 readiness script records machine-readable pass/fail and exits nonzero on failures', () => {
  const script = read('windows/Test-M37-Readiness.ps1');
  assert.match(script, /ConvertTo-Json/);
  assert.match(script, /if \(-not \$allPassed\).*exit 1/);
  assert.match(script, /native-student-build/);
  assert.match(script, /native-gate-tests/);
});
test('M37 native input remains locked behind fail-closed gate', () => {
  assert.match(read('windows/FBS.Student.Native/WindowsInputAdapter.cs'), /EnableForVerifiedSession\(bool explicitlyEnabledByOperator\)\s*=>\s*enabled\s*=\s*false\s*;/);
  assert.match(read('windows/FBS.Student.Native/ControlInputGate.cs'), /InputEnabled\s*=>\s*false\s*;/);
});
