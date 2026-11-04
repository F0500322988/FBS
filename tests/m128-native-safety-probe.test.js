'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', 'windows', 'FBS.Student.Native');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const probe = read('NativeInputSafetyProbe.cs');
const program = read('Program.cs');
const adapter = read('WindowsInputAdapter.cs');
test('startup invokes fail-closed native input safety probe', () => {
  assert.match(program, /if \(!NativeInputSafetyProbe\.VerifyDisabled\(nativeInput\)\)/);
  assert.match(program, /throw new InvalidOperationException/);
});
test('probe disables adapter before attempting any input', () => {
  const disable = probe.indexOf('adapter.Disable();');
  assert.ok(disable > 0);
  assert.ok(disable < probe.indexOf('adapter.MovePointer('));
  assert.ok(disable < probe.indexOf('adapter.TapLetter('));
});
test('probe checks pointer and keyboard are rejected', () => {
  assert.match(probe, /!adapter\.Enabled/);
  assert.match(probe, /!adapter\.MovePointer\(0, 0\)/);
  assert.match(probe, /!adapter\.TapLetter\('A'\)/);
  assert.match(probe, /!adapter\.TapLetter\('1'\)/);
});
test('native adapter still cannot be enabled remotely', () => {
  assert.match(adapter, /EnableForVerifiedSession\(bool explicitlyEnabledByOperator\)\s*=> enabled = false;/);
});
test('probe never enables adapter or invokes OS input directly', () => {
  assert.doesNotMatch(probe.replace(/\/\/\/[^\n]*/g, ''), /EnableForVerifiedSession|SendInput\s*\(|DllImport/);
});
test('student stop and cleanup still disable adapter', () => {
  assert.match(program, /private void ClearPending\(\) \{[^\n]*nativeInput\.Disable\(\)/);
});
