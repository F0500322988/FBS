const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.join(__dirname, '..', 'windows', 'FBS.Teacher.Launcher');
const program = fs.readFileSync(path.join(base, 'Program.cs'), 'utf8');
const form = fs.readFileSync(path.join(base, 'TeacherAdminAuditForm.cs'), 'utf8');
const checks = [
 ['teacher launcher offers audit', program.includes('TeacherAdminAuditForm')],
 ['teacher server startup remains', program.includes('server.js')],
 ['teacher TLS prerequisite remains', program.includes('FBS_TLS_CERT')],
 ['form is right-to-left', form.includes('RightToLeftLayout = true')],
 ['form is read-only audit', form.includes('قراءة فقط')],
 ['administrator directory selected', form.includes('FolderBrowserDialog')],
 ['auditor must exist', form.includes('File.Exists(auditor)')],
 ['auditor runs locally', form.includes('FBS.Admin.Audit.exe')],
 ['no shell invocation', form.includes('UseShellExecute = false')],
 ['arguments are separate', form.includes('ArgumentList = { directory.Text }')],
 ['auditor exit status checked', form.includes('process.ExitCode == 0')],
 ['no secret output surfaced', !form.includes('ReadToEnd')],
 ['no enrollment network endpoint', !form.includes('HttpListener')],
 ['no enrollment mutation', !form.includes('service.Register(')],
 ['no enrollment revocation', !form.includes('service.Remove(')],
];
for (const [name, ok] of checks) test('M150: ' + name, () => assert.ok(ok));
