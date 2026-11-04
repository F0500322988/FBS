const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../windows/Test-M55-Windows-Build.ps1'), 'utf8');
test('M55 fails closed when Windows tools or builds fail', () => {
  assert.match(script, /Windows_NT/);
  assert.match(script, /Get-Command \$command/);
  assert.match(script, /if \(-not \$report\.passed\) \{ exit 1 \}/);
  assert.match(script, /\$report\.error = \$_.Exception.Message/);
});
test('M55 checks native student, teacher and safety suite', () => {
  for (const item of ['FBS.Student.Native.csproj', 'FBS.Teacher.Launcher.csproj', 'FBS.NativeGate.Tests.csproj', 'node']) assert.ok(script.includes(item));
  assert.match(script, /osInputEnabled = \$false/);
});
