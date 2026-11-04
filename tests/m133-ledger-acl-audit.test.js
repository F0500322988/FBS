const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'windows/Test-M133-Ledger-Permissions.ps1'), 'utf8');
const student = fs.readFileSync(path.join(root, 'windows/FBS.Student.Native/Program.cs'), 'utf8');
const adapter = fs.readFileSync(path.join(root, 'windows/FBS.Student.Native/WindowsInputAdapter.cs'), 'utf8');
const cases = [
 ['script is read only', () => { assert.match(script, /Get-Acl -LiteralPath/); assert.doesNotMatch(script, /Set-Acl|icacls\s+.*\/grant|takeown\s+\/f/i); }],
 ['requires Windows', () => assert.match(script, /Win32NT/)],
 ['checks actual student ledger path', () => { assert.match(script, /FBS\\Classroom\\student-stopped-sessions\.json/); assert.match(student, /student-stopped-sessions\.json/); }],
 ['checks directory and file', () => assert.match(script, /@\(\$folder, \$ledger\)/)],
 ['uses ACL SID rather than localized names', () => assert.match(script, /SecurityIdentifier/)],
 ['flags Everyone write', () => assert.match(script, /S-1-1-0/)],
 ['flags anonymous write', () => assert.match(script, /S-1-5-7/)],
 ['warns for Users write', () => assert.match(script, /S-1-5-32-545/)],
 ['warns for Authenticated Users write', () => assert.match(script, /S-1-5-11/)],
 ['includes inherited ACEs in audit', () => assert.match(script, /\$acl\.Access/)],
 ['reports missing ledger as not checked', () => assert.match(script, /NOT_CREATED/)],
 ['supports JSON output', () => assert.match(script, /ConvertTo-Json -Depth 6/)],
 ['fails on unsafe permission', () => assert.match(script, /if \(\$failed\) \{ exit 1 \}/)],
 ['does not claim ACL means integrity', () => assert.match(script, /does not prove ledger integrity/)],
 ['native input remains disabled', () => assert.match(adapter, /enabled = false/)],
];
for (const [name, fn] of cases) test('M133: '+name, fn);
