# M100: Observe a manually launched app. Never starts processes or changes settings.
[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][ValidateSet('Teacher','Student')][string]$Role,
 [string]$InstallDirectory='',
 [string]$Report='.\m100-live-startup.json',
 [int]$ObserveSeconds=10,
 [switch]$ConfirmedVisibleUI,
 [switch]$ConfirmedExpectedBehavior
)
$ErrorActionPreference='Stop'
if($env:OS -ne 'Windows_NT'){throw 'windows_required'}
if($ObserveSeconds -lt 2 -or $ObserveSeconds -gt 60){throw 'invalid_observation_window'}
if(-not $InstallDirectory){
 if($Role -eq 'Student'){$InstallDirectory=Join-Path $env:LOCALAPPDATA 'Programs\FBS Classroom Student'}
 else {$InstallDirectory=Join-Path $env:ProgramFiles 'FBS Classroom Teacher'}
}
$root=[IO.Path]::GetFullPath($InstallDirectory)
$binary=if($Role -eq 'Teacher'){'FBS.Teacher.exe'}else{'FBS.Student.Native.exe'}
$exe=Join-Path (Join-Path $root $Role) $binary
$checks=New-Object System.Collections.Generic.List[object]
function AddCheck([string]$name,[bool]$ok,[string]$remedy){
 $checks.Add([ordered]@{name=$name;passed=$ok;remedy=$(if($ok){''}else{$remedy})})
}
$exists=Test-Path -LiteralPath $exe -PathType Leaf
AddCheck 'role_executable' $exists 'Role EXE missing from installation.'
$processName=[IO.Path]::GetFileNameWithoutExtension($binary)
function FindRoleProcess {
 if(-not $exists){return $false}
 $items=@(Get-CimInstance Win32_Process -Filter "Name='$binary'" -ErrorAction SilentlyContinue)
 foreach($item in $items){
  if($item.ExecutablePath -and ([string]::Equals([IO.Path]::GetFullPath($item.ExecutablePath),$exe,[StringComparison]::OrdinalIgnoreCase))){return $true}
 }
 return $false
}
$seenStart=FindRoleProcess
Start-Sleep -Seconds $ObserveSeconds
$seenEnd=FindRoleProcess
AddCheck 'process_seen_at_start' $seenStart 'Launch the installed EXE manually before starting this audit.'
AddCheck 'process_still_running' $seenEnd 'Role EXE was not running at the end of the observation window.'
AddCheck 'ui_confirmed_by_operator' ([bool]$ConfirmedVisibleUI) 'Visually inspect the app and pass -ConfirmedVisibleUI only after verification.'
AddCheck 'behavior_confirmed_by_operator' ([bool]$ConfirmedExpectedBehavior) 'Verify expected role behavior manually and pass -ConfirmedExpectedBehavior.'
$failed=@($checks | Where-Object {-not $_.passed})
$summary=[ordered]@{stage='M100';role=$Role;passed=($failed.Count -eq 0);checks=@($checks);failedCount=$failed.Count;observationSeconds=$ObserveSeconds;remoteInputEnabled=$false;scope='manual_launch_process_observation_and_operator_attestation';limitations='No GUI automation, TLS verification, connectivity, screen sharing or consent validation; operator flags are self-attested.'}
$destination=[IO.Path]::GetFullPath($Report)
$parent=Split-Path -Parent $destination
if(-not (Test-Path -LiteralPath $parent -PathType Container)){throw 'report_parent_missing'}
$summary | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath $destination -Encoding UTF8
Write-Host "M100 $Role startup: $(if($summary.passed){'PASS'}else{'FAIL'})"
if(-not $summary.passed){exit 1}
