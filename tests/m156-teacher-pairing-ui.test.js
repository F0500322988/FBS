const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', 'windows', 'FBS.Teacher.Launcher');
const ui = fs.readFileSync(path.join(root, 'TeacherPairingAuditForm.cs'), 'utf8');
const parent = fs.readFileSync(path.join(root, 'TeacherAdminAuditForm.cs'), 'utf8');
const listener = fs.readFileSync(path.join(root, 'TeacherPinnedTlsListener.cs'), 'utf8');
const cases = [
 ['teacher audit offers pairing test', () => assert.match(parent, /new TeacherPairingAuditForm\(/)],
 ['right to left UI', () => assert.match(ui, /RightToLeftLayout = true/)],
 ['explicit administrator directory', () => assert.match(ui, /FolderBrowserDialog/)],
 ['administrator ACL check', () => assert.match(ui, /AdministratorDirectoryAcl\.Validate/)],
 ['existing state required', () => assert.match(ui, /WindowsEnrollmentBootstrap\.OpenExisting/)],
 ['no automatic provisioning', () => assert.doesNotMatch(ui, /ProvisionNew|InitializeNew/)],
 ['certificate file chooser', () => assert.match(ui, /OpenFileDialog/)],
 ['PFX password hidden', () => assert.match(ui, /UseSystemPasswordChar = true/)],
 ['private key ephemeral', () => assert.match(ui, /EphemeralKeySet/)],
 ['explicit IP only', () => assert.match(ui, /IPAddress\.TryParse/)],
 ['wildcard IP rejected', () => assert.match(ui, /IPAddress\.Any\.Equals/)],
 ['start is opt in', () => assert.match(ui, /start\.Click \+=/)],
 ['stop available', () => assert.match(ui, /stop\.Click \+=/)],
 ['cancellation on close', () => assert.match(ui, /FormClosing \+=/)],
 ['identity-only listener', () => assert.match(ui, /RunPairingAuditAsync/)],
 ['no remote input', () => assert.doesNotMatch(ui, /SendInput|mouse_event|keybd_event/)],
 ['keys cleared after loading', () => assert.match(ui, /ZeroMemory\(registryKey\)/)],
 ['encrypted registry loaded', () => assert.match(ui, /new PersistentManagedEnrollment/)],
 ['listener verifies one-time signature', () => assert.match(listener, /VerifyOnce\(/)],
 ['listener does not dispatch commands', () => assert.doesNotMatch(listener, /ExecuteRemoteCommand\(/)],
];
for (const [name, fn] of cases) test('M156 '+name, fn);
