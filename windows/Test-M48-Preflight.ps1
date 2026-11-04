param([string]$TeacherHostName = 'TEACHER-PC', [string]$StudentHostName = 'STUDENT-PC', [string]$M47ReportPath = '.\m47-one-student.json', [string]$ReportPath = '.\m48-preflight.json')
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not (Test-Path $M47ReportPath)) { throw 'M47 evidence missing. Run and verify the M47 physical rehearsal first.' }
$previous = Get-Content -Raw $M47ReportPath | ConvertFrom-Json
$checks = @('nativeBuildVerified','nativeTestsVerified','teacherBuildVerified','studentCanStop','disconnectFailsClosed','expiryFailsClosed','replayRejected','tlsIdentityVerified')
$report = [ordered]@{stage='M48';timestamp=(Get-Date).ToUniversalTime().ToString('o');platform='Windows 11';studentCount=1;teacherHost=$TeacherHostName;studentHost=$StudentHostName;operatorPresent=$false;studentPresent=$false;studentExplicitlyConsented=$false;nativeInputEnabled=$false;m47Evidence=$previous}
foreach($check in $checks) { $report[$check] = 'not-run' }
$report | ConvertTo-Json -Depth 12 | Set-Content -Encoding UTF8 $ReportPath
Write-Host 'Created review-only checklist. Checks default to not-run. No input injection is enabled.'
Push-Location $root
try { node .\single-device-preflight.js $ReportPath; exit $LASTEXITCODE } finally { Pop-Location }
