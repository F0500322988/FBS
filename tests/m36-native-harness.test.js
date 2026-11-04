const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
test('M36 native test harness links production gate and covers stop/replay/expiry', () => {
  const project = fs.readFileSync(path.join(root,'windows/FBS.NativeGate.Tests/FBS.NativeGate.Tests.csproj'),'utf8');
  const source = fs.readFileSync(path.join(root,'windows/FBS.NativeGate.Tests/Program.cs'),'utf8');
  const script = fs.readFileSync(path.join(root,'windows/Test-M36-Native.ps1'),'utf8');
  assert.match(project,/FBS.Student.Native\/ControlInputGate.cs/);
  for (const phrase of ['consent required','replay rejected','expired session rejected','stop closes gate','cross-session rejected','native input remains disabled']) assert.ok(source.includes(phrase),phrase);
  assert.match(script,/dotnet run/);
  assert.match(script,/dotnet build/);
});
