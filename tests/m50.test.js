const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.join(__dirname, '..', 'windows');
test('M50 native preview pipeline exists and never injects input', () => {
  const code = fs.readFileSync(path.join(base, 'FBS.Student.Native', 'VerifiedPreviewPipeline.cs'), 'utf8');
  assert.match(code, /dryRun\.Evaluate\(/);
  assert.match(code, /guard\.Evaluate\(/);
  assert.match(code, /audit\.Record\(/);
  assert.match(code, /public bool MayInjectInput => false/);
  assert.doesNotMatch(code, /SendInput\s*\(|MovePointer\s*\(|TapLetter\s*\(/);
});
test('M50 native test project compiles actual pipeline source', () => {
  const csproj = fs.readFileSync(path.join(base, 'FBS.NativeGate.Tests', 'FBS.NativeGate.Tests.csproj'), 'utf8');
  assert.match(csproj, /VerifiedPreviewPipeline\.cs/);
  const tests = fs.readFileSync(path.join(base, 'FBS.NativeGate.Tests', 'Program.cs'), 'utf8');
  assert.match(tests, /M50 replay blocked/);
  assert.match(tests, /M50 disconnected session rejected/);
});
