const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const guard = fs.readFileSync(path.join(root, 'windows/FBS.Student.Native/SingleStudentExecutionGuard.cs'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'windows/FBS.Student.Native/Program.cs'), 'utf8');
const adapter = fs.readFileSync(path.join(root, 'windows/FBS.Student.Native/WindowsInputAdapter.cs'), 'utf8');
test('M49 native guard has hard no-injection policy', () => {
  assert.match(guard, /public bool MayInjectInput => false/);
  assert.match(guard, /rejected-native-execution-not-released/);
  assert.doesNotMatch(guard, /SendInput\s*\(/);
});
test('M49 guard checks local arm, single target and contact freshness', () => {
  assert.match(guard, /!localOperatorArmed/);
  assert.match(guard, /targetDeviceCount != 1/);
  assert.match(guard, /TimeSpan.FromSeconds\(6\)/);
  assert.match(guard, /studentStopRequested/);
});
test('M49 UI disables guard on preview gate shutdown', () => {
  assert.match(ui, /executionGuard.Stop\(\)/);
  assert.match(adapter, /=> enabled = false/);
});
test('M49 native test harness includes guard', () => {
  const csproj = fs.readFileSync(path.join(root, 'windows/FBS.NativeGate.Tests/FBS.NativeGate.Tests.csproj'), 'utf8');
  assert.match(csproj, /SingleStudentExecutionGuard.cs/);
});
