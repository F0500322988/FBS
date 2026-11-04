const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const vault = fs.readFileSync(path.join(root, 'windows/FBS.Student.Native/WindowsAdminCredentialVault.cs'), 'utf8');
const startup = fs.readFileSync(path.join(root, 'windows/FBS.Student.Native/Program.cs'), 'utf8');
const checks = [
 ['Windows-only', /OperatingSystem\.IsWindows\(\)/],
 ['DPAPI current-user protection', /ProtectedData\.Protect\(plain, Entropy, DataProtectionScope\.CurrentUser\)/],
 ['DPAPI current-user opening', /ProtectedData\.Unprotect\(blob, Entropy, DataProtectionScope\.CurrentUser\)/],
 ['no overwrite', /FileMode\.CreateNew/],
 ['existing file required', /File\.ReadAllBytes\(full\)/],
 ['password length floor', /password\.Length < 14/],
 ['random registry key', /registryKey = RandomNumberGenerator\.GetBytes\(32\)/],
 ['random lockout key', /lockoutKey = RandomNumberGenerator\.GetBytes\(32\)/],
 ['credential derivation', /AuthenticatedEnrollmentService\.CreateVerifier\(password\)/],
 ['envelope size bound', /blob\.Length > 4096/],
 ['record version check', /record\.Version != 1/],
 ['wipe plaintext', /CryptographicOperations\.ZeroMemory\(plain\)/],
 ['UI remains default hidden', /Visible = false/],
 ['UI remains default disabled', /Enabled = false/],
];
for (const [name, pattern] of checks) test('M145 '+name, () => assert.match(name.startsWith('UI') ? startup : vault, pattern));
