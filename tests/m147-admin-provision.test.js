const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root,'windows/FBS.Admin.Provision/Program.cs'),'utf8');
const project = fs.readFileSync(path.join(root,'windows/FBS.Admin.Provision/FBS.Admin.Provision.csproj'),'utf8');
for (const [name,pattern] of [
 ['Windows-only', /OperatingSystem\.IsWindows\(\)/],
 ['interactive console', /Console\.IsInputRedirected/],
 ['no password in CLI args', /args\.Length != 1/],
 ['reject existing state', /EnumerateFileSystemEntries\(root\)/],
 ['explicit confirmation', /"PROVISION"/],
 ['hidden password input', /Console\.ReadKey\(intercept: true\)/],
 ['minimum password length', /password\.Length < 14/],
 ['DPAPI provisioning', /WindowsAdminCredentialVault\.ProvisionNew/],
 ['encrypted registry initialized', /PersistentManagedEnrollment\.InitializeNew/],
 ['durable lockout initialized', /new AuthenticatedEnrollmentService\(enrollment/],
 ['restart validation', /WindowsEnrollmentBootstrap\.OpenExisting\(root\)/],
 ['no silent cleanup of partial state', /Partial provisioning is deliberately left intact/],
 ['key memory cleared', /CryptographicOperations\.ZeroMemory\(registryKey\)/],
 ['separate console project', /<OutputType>Exe<\/OutputType>/],
 ['references native library', /ProjectReference Include="\.\.\/FBS.Student.Native/],
]) test('M147 '+name,()=>assert.match(name==='separate console project'||name==='references native library'?project:source,pattern));
