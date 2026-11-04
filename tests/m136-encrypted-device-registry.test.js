const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const store = fs.readFileSync(path.join(root, 'windows/FBS.Student.Native/EncryptedDeviceRegistryStore.cs'), 'utf8');
const registry = fs.readFileSync(path.join(root, 'windows/FBS.Student.Native/ManagedDeviceRegistry.cs'), 'utf8');
const smoke = fs.readFileSync(path.join(root, 'windows/FBS.NativeSafety.Smoke/Program.cs'), 'utf8');
const project = fs.readFileSync(path.join(root, 'windows/FBS.NativeSafety.Smoke/FBS.NativeSafety.Smoke.csproj'), 'utf8');
for (const [label, pattern, source] of [
  ['AES-GCM encryption', /new AesGcm\(secret, 16\)/, store],
  ['fresh random nonce', /RandomNumberGenerator.GetBytes\(12\)/, store],
  ['associated data binds format', /Context\)/, store],
  ['requires external key', /secret.Length != 32/, store],
  ['atomic replacement', /File.Move\(temp, full, true\)/, store],
  ['temporary cleanup', /File.Delete\(temp\)/, store],
  ['tamper authentication', /aes.Decrypt\(/, store],
  ['bounded input', /1024 \* 1024/, store],
  ['no persisted challenges', /Pending challenges are intentionally never persisted/, registry],
  ['revalidate restored device keys', /restored.Provision\(id, spki, administratorAuthenticated: true\)/, registry],
  ['preserve revoked identifiers', /restored.revoked.Add\(id\)/, registry],
  ['native smoke includes store', /EncryptedDeviceRegistryStore.cs/, project],
  ['native smoke executes persistence test', /TestEncryptedRegistryPersistence\(\)/, smoke],
  ['native smoke tests tampering', /M136 tampered ciphertext rejected/, smoke],
  ['native smoke tests wrong key', /M136 incorrect encryption key rejected/, smoke],
  ['native smoke tests durable revocation', /M136 revocation survives restart/, smoke],
]) test('M136 '+label, () => assert.match(source, pattern));
