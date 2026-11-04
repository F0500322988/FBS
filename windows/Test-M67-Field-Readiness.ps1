param(
 [ValidateSet('Teacher','Student')][string]$Role='Teacher',
 [string]$TeacherIP='',
 [string]$ExpectedCertSha256=''
)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$roleLower=$Role.ToLowerInvariant()
$report=Join-Path $root "m67-$roleLower-m62.json"
$script=Join-Path $PSScriptRoot 'Test-M62-Two-PC.ps1'
$argsList=@('-NoProfile','-ExecutionPolicy','RemoteSigned','-File',$script,'-Role',$Role,'-ReportPath',$report)
if($TeacherIP){$argsList+=@('-TeacherIP',$TeacherIP)}
if($ExpectedCertSha256){$argsList+=@('-ExpectedCertSha256',$ExpectedCertSha256)}
& powershell.exe @argsList
$code=$LASTEXITCODE
Write-Host "M67 $Role preflight evidence: $report"
Write-Host 'Manual M63 observations are still required on both physical devices.'
if($code -ne 0){exit $code}
