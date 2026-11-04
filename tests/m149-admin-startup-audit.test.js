const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const audit = fs.readFileSync(path.join(root,'windows/FBS.Admin.Audit/Program.cs'),'utf8');
const project = fs.readFileSync(path.join(root,'windows/FBS.Admin.Audit/FBS.Admin.Audit.csproj'),'utf8');
const runner = fs.readFileSync(path.join(root,'windows/Test-M149-Admin-Startup.ps1'),'utf8');
for(const [name,source,pattern] of [
 ['Windows restriction',audit,/OperatingSystem\.IsWindows\(\)/],
 ['existing directory ACL verified',audit,/AdministratorDirectoryAcl\.Validate\(root\)/],
 ['vault file required',audit,/admin-credentials\.dpapi/],
 ['registry file required',audit,/managed-devices\.enc/],
 ['lockout file required',audit,/admin-lockout\.enc/],
 ['reparse point rejected',audit,/FileAttributes\.ReparsePoint/],
 ['zero-length state rejected',audit,/\.Length == 0/],
 ['existing state opened',audit,/WindowsEnrollmentBootstrap\.OpenExisting\(root\)/],
 ['no provisioning invoked',audit,/read-only local verification/],
 ['no secret output',audit,/Does not print secret material/],
 ['fail closed',audit,/return 1;/],
 ['project references native implementation',project,/ProjectReference Include="\.\.\/FBS\.Student\.Native/],
 ['project links existing ACL validator',project,/AdministratorDirectoryAcl\.cs" Link=/],
 ['PowerShell forwards directory',runner,/-- \$AdminDirectory/],
 ['PowerShell checks process exit',runner,/\$LASTEXITCODE -ne 0/],
]) test('M149 '+name,()=>assert.match(source,pattern));
