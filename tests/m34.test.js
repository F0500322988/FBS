'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('M34 LAN diagnostic has no firewall mutation or silent remote access',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../windows/Test-M34-LAN.ps1'),'utf8');
 assert.match(s,/Test-NetConnection/);assert.match(s,/Get-NetUDPEndpoint/);
 assert.match(s,/Get-NetFirewallRule/);assert.match(s,/ReportPath/);
 assert.doesNotMatch(s,/New-NetFirewallRule|Set-NetFirewallRule|Remove-NetFirewallRule|SendInput/);
});
test('M34 agent still pins teacher TLS fingerprint',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../student-agent.js'),'utf8');
 assert.match(s,/pinnedRequest/);
 const transport=fs.readFileSync(path.join(__dirname,'../pinned-https.js'),'utf8');
 assert.match(transport,/Teacher TLS certificate mismatch/);
 assert.match(transport,/crypto\.timingSafeEqual/);
});
