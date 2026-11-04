const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const p=fs.readFileSync('windows/Test-M159-Lan-Readiness.ps1','utf8');
const doc=fs.readFileSync('M159-START-HERE.md','utf8');
for (const [name,rx] of [
 ['role parameter',/ValidateSet\('Teacher','Student'\)/],
 ['explicit host',/Mandatory=\$true\)\]\[string\]\$TeacherHost/],
 ['bounded port',/ValidateRange\(1024,65535\)/],
 ['default port',/47443/],
 ['dns check',/GetHostAddresses/],
 ['listener check',/Get-NetTCPConnection/],
 ['firewall inventory',/Get-NetFirewallRule/],
 ['TCP connect',/ConnectAsync/],
 ['TCP timeout',/FromSeconds\(5\)/],
 ['TLS explicit opt in',/if \(\$RequireTls\)/],
 ['SHA256 pin',/SHA256\]::HashData/],
 ['64 hex validation',/0-9A-F\]\{64\}/],
 ['TLS client',/SslStream/],
 ['TLS 1.2',/Tls12/],
 ['TLS 1.3',/Tls13/],
 ['fail closed exit',/exit 1/],
 ['no firewall mutation',/^((?!New-NetFirewallRule|Set-NetFirewallRule|Disable-NetFirewallRule).)*$/s],
 ['teacher directions',/teacher PC/i],
 ['student directions',/student PC/i],
 ['no control',/no remote-control commands/i],
]) test(name,()=>assert.match(name.startsWith('teacher directions')||name.startsWith('student directions')||name==='no control'?doc:p,rx));
