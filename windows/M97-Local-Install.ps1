# M97: Local, opt-in Windows installer runner. Never runs on remote machines.
[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][ValidateSet('Teacher','Student')][string]$Role,
 [Parameter(Mandatory=$true)][string]$Installer,
 [Parameter(Mandatory=$true)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExpectedSha256,
 [string]$Report = '.\m97-local-install.json',
 [switch]$Execute
)
$ErrorActionPreference='Stop'
$summary=[ordered]@{stage='M97';role=$Role;mode=$(if($Execute){'execute'}else{'dry-run'});passed=$false;hashVerified=$false;installerExitCode=$null;issues=@();remoteInputEnabled=$false;limitations='Local Windows only. Installer may require elevation. No silent install or automatic rollback.'}
try {
 if($env:OS -ne 'Windows_NT'){throw 'windows_required'}
 $resolved=(Resolve-Path -LiteralPath $Installer -ErrorAction Stop).Path
 if(-not [IO.Path]::GetFileName($resolved).Equals("FBS-Classroom-$Role-M76-Setup-PREVIEW.exe",[StringComparison]::OrdinalIgnoreCase)){throw 'unexpected_installer_filename'}
 if(-not $resolved.EndsWith('.exe',[StringComparison]::OrdinalIgnoreCase)){throw 'exe_required'}
 $actual=(Get-FileHash -LiteralPath $resolved -Algorithm SHA256).Hash.ToLowerInvariant()
 if($actual -ne $ExpectedSha256.ToLowerInvariant()){throw 'installer_sha256_mismatch'}
 $summary.hashVerified=$true
 if($Execute){
  # Explicit user opt-in, local execution only; no hidden/silent flags.
  $process=Start-Process -FilePath $resolved -Wait -PassThru
  $summary.installerExitCode=[int]$process.ExitCode
  if($process.ExitCode -ne 0){throw 'installer_nonzero_exit'}
 }
 $summary.passed=$true
} catch {
 $summary.issues=@($_.Exception.Message)
} finally {
 # Keep report free of full paths, usernames and secrets.
 $reportPath=[IO.Path]::GetFullPath($Report)
 $parent=Split-Path -Parent $reportPath
 if(-not (Test-Path -LiteralPath $parent -PathType Container)){throw 'report_parent_missing'}
 $summary | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $reportPath -Encoding UTF8
 Write-Host "M97 $Role $($summary.mode): $(if($summary.passed){'PASS'}else{'FAIL'})"
}
if(-not $summary.passed){exit 1}
