# M98: Read-only local verification of installed role package. Does not launch or modify software.
[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][ValidateSet('Teacher','Student')][string]$Role,
 [string]$InstallDirectory='',
 [string]$Report='.\m98-post-install.json',
 [string]$ExpectedExeSha256=''
)
$ErrorActionPreference='Stop'
if($env:OS -ne 'Windows_NT'){throw 'windows_required'}
if($ExpectedExeSha256 -and $ExpectedExeSha256 -notmatch '^[a-fA-F0-9]{64}$'){throw 'invalid_expected_hash'}
if(-not $InstallDirectory){
 if($Role -eq 'Student'){$InstallDirectory=Join-Path $env:LOCALAPPDATA 'Programs\FBS Classroom Student'}
 else {$InstallDirectory=Join-Path $env:ProgramFiles 'FBS Classroom Teacher'}
}
$root=[IO.Path]::GetFullPath($InstallDirectory)
$checks=New-Object System.Collections.Generic.List[object]
function AddCheck([string]$name,[bool]$passed,[string]$remedy){
 $checks.Add([ordered]@{name=$name;passed=$passed;remedy=$(if($passed){''}else{$remedy})})
}
$binary=if($Role -eq 'Teacher'){'FBS.Teacher.exe'}else{'FBS.Student.Native.exe'}
$exe=Join-Path (Join-Path $root $Role) $binary
$node=Join-Path (Join-Path $root 'Runtime') 'node.exe'
$entry=Join-Path (Join-Path $root 'Runtime') $(if($Role -eq 'Teacher'){'server.js'}else{'student-agent.js'})
AddCheck 'install_directory' (Test-Path -LiteralPath $root -PathType Container) 'Install the role-specific M76 package.'
AddCheck 'role_executable' (Test-Path -LiteralPath $exe -PathType Leaf) 'The role executable is missing; reinstall.'
AddCheck 'bundled_node' (Test-Path -LiteralPath $node -PathType Leaf) 'Bundled Runtime/node.exe is missing; rebuild and reinstall.'
AddCheck 'runtime_entry' (Test-Path -LiteralPath $entry -PathType Leaf) 'Runtime entry is missing; rebuild and reinstall.'
if($Role -eq 'Student'){
 AddCheck 'student_configuration_script' (Test-Path -LiteralPath (Join-Path $root 'Configure-Student.ps1') -PathType Leaf) 'Student configuration script is missing.'
 AddCheck 'student_agent_launcher' (Test-Path -LiteralPath (Join-Path $root 'Runtime\Start-Student-Agent.ps1') -PathType Leaf) 'Student agent launcher is missing.'
}
if($ExpectedExeSha256){
 $ok=$false
 if(Test-Path -LiteralPath $exe -PathType Leaf){
  try {$ok=((Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash -ieq $ExpectedExeSha256)} catch {$ok=$false}
 }
 AddCheck 'exe_sha256' $ok 'Executable SHA256 differs from trusted build manifest.'
}
$failed=@($checks | Where-Object {-not $_.passed})
$summary=[ordered]@{stage='M98';role=$Role;passed=($failed.Count -eq 0);checks=@($checks);failedCount=$failed.Count;remoteInputEnabled=$false;limitations='Filesystem checks only; does not launch EXE, verify live network/consent, or certify installation.'}
$destination=[IO.Path]::GetFullPath($Report)
$parent=Split-Path -Parent $destination
if(-not (Test-Path -LiteralPath $parent -PathType Container)){throw 'report_parent_missing'}
$summary | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath $destination -Encoding UTF8
Write-Host "M98 $Role post-install: $(if($summary.passed){'PASS'}else{'FAIL'})"
if(-not $summary.passed){exit 1}
