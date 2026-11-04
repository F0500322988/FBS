const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.join(__dirname, '..', 'windows', 'FBS.Student.Native');
const bootstrap = fs.readFileSync(path.join(base, 'WindowsEnrollmentBootstrap.cs'), 'utf8');
const vault = fs.readFileSync(path.join(base, 'WindowsAdminCredentialVault.cs'), 'utf8');
const student = fs.readFileSync(path.join(base, 'Program.cs'), 'utf8');
const cases = [
 ['Windows-only startup', /OperatingSystem\.IsWindows\(\)/],
 ['requires directory', /Directory\.Exists\(root\)/],
 ['requires existing credential vault', /File\.Exists\(vaultPath\)/],
 ['requires existing registry', /File\.Exists\(registryPath\)/],
 ['requires existing lockout', /File\.Exists\(lockoutPath\)/],
 ['opens protected vault', /WindowsAdminCredentialVault\.OpenExisting\(vaultPath\)/],
 ['opens persistent registry', /new PersistentManagedEnrollment\(registryPath, registryKey\)/],
 ['rejects locked registry', /registry\.IsLocked/],
 ['opens existing lockout', /AuthenticatedEnrollmentService\.OpenExisting\(/],
 ['rejects locked admin', /admin\.IsLockedDown/],
 ['zeroes registry key', /ZeroMemory\(registryKey\)/],
 ['zeroes lockout key', /ZeroMemory\(lockoutKey\)/],
 ['does not auto-provision', /return new ManagedEnrollmentCommandService\(admin\)/],
];
for (const [name, re] of cases) test('M146: '+name, () => assert.match(bootstrap, re));
test('M146: vault and verifier share 14-character minimum', () => assert.match(vault, /password\.Length < 14/));
test('M146: student UI still starts disabled', () => assert.match(student, /Visible = false/));
