param(
 [Parameter(Mandatory=$true)][string]$TeacherIP,
 [Parameter(Mandatory=$true)][string]$ExpectedCertSha256,
 [int]$TeacherPort=4180,
 [string]$OutputReport='m82-student-lan.json'
)
$ErrorActionPreference='Stop'
if($env:OS -ne 'Windows_NT'){throw 'Run this diagnostic on Windows.'}
$scriptPath=Join-Path $PSScriptRoot 'M82-Lan-Readiness.js'
node $scriptPath $TeacherIP $TeacherPort $ExpectedCertSha256 $OutputReport
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
