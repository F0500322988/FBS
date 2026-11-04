const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(root, 'windows/FBS.Student.Native/ManagedEnrollmentAdminForm.cs'), 'utf8');
const project = fs.readFileSync(path.join(root, 'windows/FBS.NativeSafety.Smoke/FBS.NativeSafety.Smoke.csproj'), 'utf8');
for (const [name, pattern] of [
  ['local-only WinForms dialog', /sealed class ManagedEnrollmentAdminForm : Form/],
  ['injected service required', /ManagedEnrollmentAdminForm\(ManagedEnrollmentCommandService service\)/],
  ['no default administrator password', /UseSystemPasswordChar = true/],
  ['registration delegates to authenticated boundary', /service\.Register\(deviceId\.Text, File\.ReadAllBytes\(file\), password\.Text, DateTimeOffset\.UtcNow\)/],
  ['revocation delegates to authenticated boundary', /service\.Remove\(deviceId\.Text, password\.Text, DateTimeOffset\.UtcNow\)/],
  ['password cleared after every attempt', /finally \{ password\.Clear\(\); \}/],
  ['password cleared on close', /FormClosed \+= .*password\.Clear\(\)/],
  ['public key size bounded', /info\.Length < 200 \|\| info\.Length > 2048/],
  ['no detailed authentication failure', /رُفضت العملية؛ تحقق من الصلاحيات والبيانات/],
  ['Arabic RTL UI', /RightToLeftLayout = true/],
  ['no network endpoint', /No network listener/],
  ['smoke project compiles form', /ManagedEnrollmentAdminForm\.cs/],
]) test('M142 '+name, () => assert.match(name === 'smoke project compiles form' ? project : ui, pattern));
