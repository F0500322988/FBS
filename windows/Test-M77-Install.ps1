param(
  [ValidateSet('Teacher','Student')][string]$Role,
  [string]$InstallDirectory,
  [string]$BaselineReport,
  [string]$OutputReport = '.\m77-install-audit.json'
)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if ($env:OS -ne 'Windows_NT') { throw 'M77 requires Windows.' }
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { throw 'Node.js is required.' }
if (-not $InstallDirectory) {
  if ($Role -eq 'Teacher') { $InstallDirectory=Join-Path $env:ProgramFiles 'FBS Classroom Teacher' }
  else { $InstallDirectory=Join-Path $env:LOCALAPPDATA 'Programs\FBS Classroom Student' }
}
if (-not (Test-Path -LiteralPath $InstallDirectory -PathType Container)) { throw "Installation directory missing: $InstallDirectory" }
$argsList=@((Join-Path $PSScriptRoot 'M77-Install-Audit.js'),$InstallDirectory,$Role,$OutputReport)
if ($BaselineReport) { $argsList+= $BaselineReport }
& node @argsList
if ($LASTEXITCODE -ne 0) { throw "M77 audit failed. Inspect $OutputReport" }
Write-Host "M77 installation audit passed for $Role. This does not test UI launch or uninstall."
