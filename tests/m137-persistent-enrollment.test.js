const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'windows/FBS.Student.Native/PersistentManagedEnrollment.cs'), 'utf8');
const checks = [
  ['requires encrypted registry to exist', /EncryptedDeviceRegistryStore\.Load\(this\.path, this\.secret\)/],
  ['requires explicit initialization approval', /if \(!administratorAuthenticated\) throw new UnauthorizedAccessException/],
  ['does not overwrite existing registry on initialization', /if \(File\.Exists\(full\)\) throw new IOException/],
  ['denies unauthenticated provisioning', /if \(locked \|\| !administratorAuthenticated\) return false/],
  ['clones registry before changes', /var candidate = ManagedDeviceRegistry\.RestoreFromStorage/],
  ['persists before publishing changed registry', /EncryptedDeviceRegistryStore\.Save\(path, candidate, secret\);\s*registry = EncryptedDeviceRegistryStore\.Load/],
  ['locks after persistence errors', /locked = true/],
  ['rejects challenge when locked', /locked \? null : registry\.IssueChallenge/],
  ['rejects verification when locked', /!locked && registry\.VerifyOnce/],
  ['does not claim real authentication', /boolean is NOT authentication/],
  ['does not claim integration with endpoints', /not yet connected to the HTTP enrollment endpoints/],
];
for (const [name, regex] of checks) test(`M137 ${name}`, () => assert.match(source, regex));
