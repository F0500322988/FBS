const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const registry = fs.readFileSync(path.join(root, 'windows/FBS.Student.Native/ManagedDeviceRegistry.cs'), 'utf8');
const smoke = fs.readFileSync(path.join(root, 'windows/FBS.NativeSafety.Smoke/Program.cs'), 'utf8');
const project = fs.readFileSync(path.join(root, 'windows/FBS.NativeSafety.Smoke/FBS.NativeSafety.Smoke.csproj'), 'utf8');
for (const [name, pattern] of [
  ['explicit admin flag for provisioning', /Provision\(string deviceId, byte\[\] spki, bool administratorAuthenticated\)/],
  ['admin flag checked', /!administratorAuthenticated/],
  ['40 device limit', /MaxDevices = 40/],
  ['duplicate enrollment rejected', /enrolled\.ContainsKey\(deviceId\)/],
  ['RSA key validation', /ImportSubjectPublicKeyInfo/],
  ['single-use challenge removal', /pending\.Remove\(deviceId, out var issued\)/],
  ['short-lived challenges', /TimeSpan\.FromSeconds\(30\)/],
  ['signed challenge verified', /DeviceChallengeProof\.Verify\(spki, issued\.Nonce, signature\)/],
  ['revocation removes pending challenges', /pending\.Remove\(deviceId\)/],
  ['revoked ID blocked', /revoked\.Contains\(deviceId\)/],
  ['nonpersistent limitation documented', /NOT a trusted persistent enrollment service/],
]) test(`M135 ${name}`, () => assert.match(registry, pattern));
test('M135 native smoke project includes registry', () => assert.match(project, /ManagedDeviceRegistry\.cs/));
test('M135 native smoke invokes registry tests', () => assert.match(smoke, /TestManagedRegistry\(\);/));
test('M135 native smoke checks replay rejection', () => assert.match(smoke, /replay denied/));
test('M135 native smoke checks expired challenges', () => assert.match(smoke, /expired challenge denied/));
test('M135 native smoke checks revocation', () => assert.match(smoke, /revoked device denied/));
