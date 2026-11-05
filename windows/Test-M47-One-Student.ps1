param([string]$TeacherHostName = $env:COMPUTERNAME, [string]$StudentHostName, [string]$M46ReportPath = '.\m46-readiness.json', [string]$ReportPath = '.\m47-one-student.json')
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not $StudentHostName) { throw 'Provide -StudentHostName for the physical student computer.' }
if (-not (Test-Path $M46ReportPath)) { throw 'M46 evidence report missing. Run M46 checks first.' }
$base = Get-Content -Raw $M46ReportPath | ConvertFrom-Json
$checks = @('studentDiscovered','studentEnrolled','tlsPinVerified','consentShown','consentGranted','previewDelivered','studentStopObserved','staleCommandRejected','disconnectStopObserved')
$report = [ordered]@{stage='M47';timestamp=(Get-Date).ToUniversalTime().ToString('o');platform='Windows 11';studentCount=1;teacherHost=$TeacherHostName;studentHost=$StudentHostName;observerConfirmed=$false;nativeInputEnabled=$false;m46Evidence=$base}
foreach ($name in $checks) { $report[$name] = 'not-run' }
Write-Host 'M47 one-student rehearsal: all checks default to not-run.'
Write-Host 'Perform physical checks using M47-START-HERE.md. Never enable WindowsInputAdapter.'
Write-Host 'Edit the JSON ONLY after directly observing each step, and set observerConfirmed true.'
$report | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 $ReportPath
Push-Location $root
try { node .\one-student-rehearsal.js $ReportPath; exit $LASTEXITCODE } finally { Pop-Location }
