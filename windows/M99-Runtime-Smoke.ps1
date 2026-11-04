# M99: safe post-install runtime smoke test. Executes bundled node only; never launches GUI or agent.
[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][ValidateSet('Teacher','Student')][string]$Role,
 [string]$InstallDirectory='',
 [string]$Report='.\m99-runtime-smoke.json',
 [int]$TimeoutSeconds=12
)
$ErrorActionPreference='Stop'
if($env:OS -ne 'Windows_NT'){throw 'windows_required'}
if($TimeoutSeconds -lt 2 -or $TimeoutSeconds -gt 60){throw 'invalid_timeout'}
if(-not $InstallDirectory){
 if($Role -eq 'Student'){$InstallDirectory=Join-Path $env:LOCALAPPDATA 'Programs\FBS Classroom Student'}
 else {$InstallDirectory=Join-Path $env:ProgramFiles 'FBS Classroom Teacher'}
}
$root=[IO.Path]::GetFullPath($InstallDirectory)
$runtime=Join-Path $root 'Runtime'
$node=Join-Path $runtime 'node.exe'
$entry=Join-Path $runtime $(if($Role -eq 'Teacher'){'server.js'}else{'student-agent.js'})
$checks=New-Object System.Collections.Generic.List[object]
function AddCheck([string]$name,[bool]$passed,[string]$detail){
 $checks.Add([ordered]@{name=$name;passed=$passed;detail=$(if($passed){''}else{$detail})})
}
function Invoke-NodeCheck([string[]]$arguments){
 $psi=New-Object System.Diagnostics.ProcessStartInfo
 $psi.FileName=$node
 $psi.WorkingDirectory=$runtime
 $psi.UseShellExecute=$false
 $psi.CreateNoWindow=$true
 $psi.RedirectStandardOutput=$true
 $psi.RedirectStandardError=$true
 foreach($argument in $arguments){[void]$psi.ArgumentList.Add($argument)}
 $p=New-Object System.Diagnostics.Process
 $p.StartInfo=$psi
 try {
  [void]$p.Start()
  if(-not $p.WaitForExit($TimeoutSeconds * 1000)){
   try{$p.Kill($true)}catch{}
   return $false
  }
  return ($p.ExitCode -eq 0)
 } catch {return $false} finally {$p.Dispose()}
}
AddCheck 'install_directory' (Test-Path -LiteralPath $root -PathType Container) 'Installation directory missing.'
AddCheck 'bundled_node' (Test-Path -LiteralPath $node -PathType Leaf) 'Runtime/node.exe missing.'
AddCheck 'runtime_entry' (Test-Path -LiteralPath $entry -PathType Leaf) 'Role runtime entry missing.'
if((Test-Path -LiteralPath $node -PathType Leaf) -and (Test-Path -LiteralPath $runtime -PathType Container)){
 AddCheck 'node_version_runs' (Invoke-NodeCheck @('--version')) 'Bundled Node failed to run.'
 if(Test-Path -LiteralPath $entry -PathType Leaf){AddCheck 'entry_syntax' (Invoke-NodeCheck @('--check',$entry)) 'Runtime entry syntax check failed.'}
 else {AddCheck 'entry_syntax' $false 'Runtime entry missing.'}
} else {
 AddCheck 'node_version_runs' $false 'Bundled Node missing.'
 AddCheck 'entry_syntax' $false 'Bundled Node or runtime entry missing.'
}
$failed=@($checks | Where-Object {-not $_.passed})
$summary=[ordered]@{stage='M99';role=$Role;passed=($failed.Count -eq 0);checks=@($checks);failedCount=$failed.Count;remoteInputEnabled=$false;scope='bundled_node_version_and_entry_syntax_only';limitations='Does not launch teacher GUI/student agent, establish network connectivity, or certify live service startup.'}
$destination=[IO.Path]::GetFullPath($Report)
$parent=Split-Path -Parent $destination
if(-not (Test-Path -LiteralPath $parent -PathType Container)){throw 'report_parent_missing'}
$summary | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath $destination -Encoding UTF8
Write-Host "M99 $Role runtime smoke: $(if($summary.passed){'PASS'}else{'FAIL'})"
if(-not $summary.passed){exit 1}
