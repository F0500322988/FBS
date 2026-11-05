param([ValidateSet('Teacher','Student')][string]$Role='Teacher',[string]$TeacherIP='', [string]$ExpectedCertSha256='',[string]$ReportPath='m62-report.json')
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$reportFile=if([IO.Path]::IsPathRooted($ReportPath)){$ReportPath}else{Join-Path $root $ReportPath}
$checks=@()
function Add-Check([string]$name,[string]$status,[string]$detail){$script:checks+=@{name=$name;status=$status;detail=$detail};Write-Host "[$status] $name : $detail"}
Push-Location $root
try {
 if(-not (Get-Command node -ErrorAction SilentlyContinue)){Add-Check 'node' 'FAIL' 'Node.js unavailable'}
 else {
  & node (Join-Path $PSScriptRoot 'M62-Runtime-Smoke.js')
  if($LASTEXITCODE -eq 0){Add-Check 'teacher-http-smoke' 'PASS' 'Local demo server authenticated and remote input remained disabled'}else{Add-Check 'teacher-http-smoke' 'FAIL' 'Local HTTP smoke failed'}
 }
 $m61=Join-Path $PSScriptRoot 'Test-M61-Two-PC.ps1'
 $args=@('-NoProfile','-ExecutionPolicy','RemoteSigned','-File',$m61,'-Role',$Role,'-ReportPath',(Join-Path $root "m62-m61-$($Role.ToLower()).json"))
 if($TeacherIP){$args+=@('-TeacherIP',$TeacherIP)}
 if($ExpectedCertSha256){$args+=@('-ExpectedCertSha256',$ExpectedCertSha256)}
 & powershell.exe @args
 if($LASTEXITCODE -eq 0){Add-Check 'm61-network-and-integrity' 'PASS' 'M61 checks passed'}else{Add-Check 'm61-network-and-integrity' 'FAIL' 'Review M61 report and certificate trust'}
 Add-Check 'device-discovery' 'MANUAL' 'Confirm actual student device appears in teacher UI'
 Add-Check 'student-consent' 'MANUAL' 'Confirm student consent is required before preview commands'
 Add-Check 'screen-preview' 'MANUAL' 'Confirm student screen preview with explicit student indicator'
 Add-Check 'stop-and-disconnect' 'MANUAL' 'Confirm immediate stop and timeout on cable/network disconnect'
} finally {Pop-Location}
$failed=@($checks|Where-Object{$_.status -eq 'FAIL'}).Count -gt 0
$report=[ordered]@{stage='M62';role=$Role;generatedAt=(Get-Date).ToUniversalTime().ToString('o');automatedChecksPassed=(-not $failed);fieldTestsCompleted=$false;readyForLiveInput=$false;checks=$checks}
$report|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $reportFile -Encoding UTF8
Write-Host "M62 report: $reportFile"
if($failed){exit 1}
