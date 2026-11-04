param(
 [Parameter(Mandatory=$true)][ValidateSet('Teacher','Student')][string]$Role,
 [string]$TeacherIP='',
 [string]$ExpectedCertSha256='',
 [string]$DistributionPath='dist-m60',
 [string]$ReportPath=''
)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$dist=if([IO.Path]::IsPathRooted($DistributionPath)){$DistributionPath}else{Join-Path $root $DistributionPath}
if(-not $ReportPath){$ReportPath="m61-$($Role.ToLowerInvariant())-report.json"}
$out=if([IO.Path]::IsPathRooted($ReportPath)){$ReportPath}else{Join-Path $root $ReportPath}
$checks=@()
function AddCheck($name,$status,$detail){$script:checks+=@{name=$name;status=$status;detail=$detail};Write-Host "[$status] $name - $detail"}
if(-not (Get-Command node -ErrorAction SilentlyContinue)){AddCheck 'node' 'FAIL' 'Node.js required to verify distribution'}
elseif(-not (Test-Path -LiteralPath $dist -PathType Container)){AddCheck 'distribution' 'FAIL' 'Build dist-m60 first using Test-M60-Runtime.ps1'}
else {
 $manifest=Join-Path $dist 'm61-manifest.json'
 if(-not (Test-Path -LiteralPath $manifest)) {AddCheck 'manifest' 'FAIL' 'Create manifest using node windows/M61-Manifest.js create dist-m60 dist-m60/m61-manifest.json'}
 else {& node (Join-Path $PSScriptRoot 'M61-Manifest.js') verify $dist $manifest
   if($LASTEXITCODE -eq 0){AddCheck 'distribution-integrity' 'PASS' 'Required runtime files match SHA256 manifest'}
   else {AddCheck 'distribution-integrity' 'FAIL' 'Missing or modified distribution files'}
 }
}
# Delegate network diagnostics to M44. Do not treat them as proof of consent or authorization.
$m44=Join-Path $PSScriptRoot 'Test-M44-Two-PC.ps1'
$m44Report=Join-Path $root "m61-m44-$($Role.ToLowerInvariant()).json"
$argsM44=@('-NoProfile','-ExecutionPolicy','RemoteSigned','-File',$m44,'-Role',$Role,'-ReportPath',$m44Report)
if($TeacherIP){$argsM44+=@('-TeacherIP',$TeacherIP)}
if($ExpectedCertSha256){$argsM44+=@('-ExpectedCertSha256',$ExpectedCertSha256)}
& powershell.exe @argsM44
if($LASTEXITCODE -eq 0){AddCheck 'network-diagnostics' 'PASS' 'M44 automated checks passed; manual tests still required'}
else {AddCheck 'network-diagnostics' 'FAIL' 'M44 network diagnostics failed; see its report'}
AddCheck 'consent-and-stop' 'MANUAL' 'Observe student consent, immediate stop, expiry, disconnect, and no stale reactivation on two actual PCs'
$failed=@($checks|Where-Object{$_.status -eq 'FAIL'}).Count -gt 0
$report=[ordered]@{stage='M61';role=$Role;generatedAt=(Get-Date).ToUniversalTime().ToString('o');automatedChecksPassed=(-not $failed);readyForLiveInput=$false;manualVerificationRequired=$true;checks=$checks;networkReport=$m44Report}
$report|ConvertTo-Json -Depth 7|Set-Content -LiteralPath $out -Encoding UTF8
Write-Host "M61 report: $out"
if($failed){exit 1}
