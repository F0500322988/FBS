param([int]$Port=4181,[int]$TimeoutMs=12000,[string]$ExpectedCertSha256='', [string]$OutputReport='m83-discovery.json')
$ErrorActionPreference='Stop'
if (-not $env:FBS_PAIRING_KEY) { throw 'Set FBS_PAIRING_KEY securely before running discovery probe.' }
$scriptPath=Join-Path $PSScriptRoot 'M83-Discovery-Probe.js'
& node $scriptPath "$Port" "$TimeoutMs" $ExpectedCertSha256 $OutputReport
if ($LASTEXITCODE -ne 0) { throw 'Discovery check failed; verify UDP 4181, firewall, LAN/VLAN and teacher server.' }
