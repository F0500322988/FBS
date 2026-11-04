param([string]$Distribution = '.\dist-m60', [string]$Report = '.\m74-native-preflight.json')
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $root
try {
  if ($env:OS -ne 'Windows_NT') { throw 'Run this preflight on Windows 11.' }
  if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { throw 'Node.js is required to run the preflight.' }
  & node (Join-Path $PSScriptRoot 'M74-Native-Preflight.js') $Distribution $Report
  if ($LASTEXITCODE -ne 0) { throw 'Native distribution preflight failed. Review the JSON report.' }
  Write-Host 'Package checks passed. This does not prove EXE launch or student consent behavior.'
  Write-Host 'To perform the physical test, launch the Teacher and Student EXEs separately on authorized Windows PCs.'
} finally { Pop-Location }
