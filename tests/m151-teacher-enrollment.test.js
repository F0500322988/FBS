const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const form = read('windows/FBS.Teacher.Launcher/TeacherAdminAuditForm.cs');
const project = read('windows/FBS.Teacher.Launcher/FBS.Teacher.Launcher.csproj');
const admin = read('windows/FBS.Student.Native/ManagedEnrollmentAdminForm.cs');
const bootstrap = read('windows/FBS.Student.Native/WindowsEnrollmentBootstrap.cs');
const checks = [
 ['teacher has local enrollment action',form.includes('إدارة تسجيل الأجهزة (مسؤول المعمل)')],
 ['teacher checks ACL before bootstrap',form.indexOf('AdministratorDirectoryAcl.Validate') < form.indexOf('WindowsEnrollmentBootstrap.OpenExisting')],
 ['teacher validates all three files', ['admin-credentials.dpapi','managed-devices.enc','admin-lockout.enc'].every(n=>form.includes(n))],
 ['teacher rejects reparse files',form.includes('FileAttributes.ReparsePoint')],
 ['teacher rejects empty files',form.includes('Length == 0')],
 ['teacher opens existing state',form.includes('WindowsEnrollmentBootstrap.OpenExisting')],
 ['teacher displays admin dialog',form.includes('new FBS.Student.Native.ManagedEnrollmentAdminForm(service)')],
 ['teacher does not provision',!form.includes('ProvisionNew(') && !form.includes('InitializeNew(')],
 ['teacher references student enrollment assembly',project.includes('ProjectReference Include="../FBS.Student.Native/FBS.Student.Native.csproj"')],
 ['teacher reuses ACL validator',project.includes('AdministratorDirectoryAcl.cs')],
 ['admin UI prompts for password',admin.includes('UseSystemPasswordChar = true')],
 ['admin UI clears password',admin.includes('password.Clear()')],
 ['admin UI offers revoke',admin.includes('service.Remove(')],
 ['admin UI offers register',admin.includes('service.Register(')],
 ['bootstrap opens only existing state',bootstrap.includes('OpenExisting(') && !bootstrap.includes('ProvisionNew(')]
];
for (const [name, ok] of checks) test(name,()=>assert.equal(ok,true));
