const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const acl = fs.readFileSync(path.join(root,'windows/FBS.Admin.Provision/AdministratorDirectoryAcl.cs'),'utf8');
const program = fs.readFileSync(path.join(root,'windows/FBS.Admin.Provision/Program.cs'),'utf8');
const script = fs.readFileSync(path.join(root,'windows/Prepare-M148-PrivateAdminDirectory.ps1'),'utf8');
for (const [name, source, pattern] of [
 ['Windows-only ACL check',acl,/OperatingSystem\.IsWindows\(\)/],
 ['directory required',acl,/Directory\.Exists\(path\)/],
 ['reparse point rejected',acl,/FileAttributes\.ReparsePoint/],
 ['owner checked',acl,/GetOwner\(typeof\(SecurityIdentifier\)\)/],
 ['current account SID',acl,/WindowsIdentity\.GetCurrent\(\)\.User/],
 ['SYSTEM SID',acl,/WellKnownSidType\.LocalSystemSid/],
 ['Administrators SID',acl,/WellKnownSidType\.BuiltinAdministratorsSid/],
 ['inherited ACL inspected',acl,/GetAccessRules\(true, true/],
 ['unapproved writable principal rejected',acl,/writable ACL for an unapproved principal/],
 ['ACL before password prompt',program,/AdministratorDirectoryAcl\.Validate\(root\);[\s\S]*?ReadSecret\("New administrator password/],
 ['ACL rechecked before vault write',program,/AdministratorDirectoryAcl\.Validate\(root\); \/\/ Recheck immediately before writing secrets/],
 ['no auto-repair',acl,/Do not attempt to repair ACLs/],
 ['helper refuses overwrite',script,/Refusing to overwrite an existing path/],
 ['helper disables inheritance',script,/SetAccessRuleProtection\(\$true, \$false\)/],
 ['helper creates directory with ACL',script,/Directory\]::CreateDirectory\(\$full, \$acl\)/],
]) test('M148 '+name,()=>assert.match(source,pattern));
