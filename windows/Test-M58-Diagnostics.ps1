param([string]$ReportPath = '.\m58-analysis.json')
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$diagnostic = Join-Path $root 'm58-m57-diagnostics.json'
$diagnosticLog = Join-Path $root 'm58-m57-diagnostics.log'
$analysis = if ([IO.Path]::IsPathRooted($ReportPath)) { $ReportPath } else { Join-Path $root $ReportPath }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is required for the M58 offline analyzer' }
# M57 is allowed to fail: its report is the evidence we need to diagnose.
& powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File (Join-Path $PSScriptRoot 'Test-M57-Diagnostics.ps1') -ReportPath $diagnostic -LogPath $diagnosticLog
$m57Exit = $LASTEXITCODE
if (-not (Test-Path $diagnostic)) { throw 'M57 did not produce a diagnostic report' }
& node (Join-Path $PSScriptRoot 'Analyze-M58-Build.js') $diagnostic $analysis $diagnosticLog (Join-Path $root 'm57-m56-build.json')
if ($LASTEXITCODE -ne 0) { throw 'M58 analysis failed' }
Write-Host "M57 exit code: $m57Exit; M58 analysis: $analysis"
if ($m57Exit -ne 0) { exit 1 }
