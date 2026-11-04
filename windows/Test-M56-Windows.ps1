param([string]$ReportPath = '.\m56-windows-build.json', [string]$LogPath = '.\m56-windows-build.log')
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $root
try {
  if ($env:OS -ne 'Windows_NT') { throw 'M56 must be run on Windows 11' }
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is required' }
  $report = if ([IO.Path]::IsPathRooted($ReportPath)) { $ReportPath } else { Join-Path $root $ReportPath }
  $log = if ([IO.Path]::IsPathRooted($LogPath)) { $LogPath } else { Join-Path $root $LogPath }
  foreach ($path in @($report,$log)) { $parent = Split-Path -Parent $path; if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null } }
  # Capture all build output without suppressing errors. Keep the report even on failure.
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'Test-M55-Windows-Build.ps1') -ReportPath $report *>&1 | Out-File -FilePath $log -Encoding UTF8
  $buildExit = $LASTEXITCODE
  if ($buildExit -ne 0) { Write-Host "Build checks failed; inspect $log and $report"; exit 1 }
  & node (Join-Path $PSScriptRoot 'Verify-M56-Report.js') $report
  if ($LASTEXITCODE -ne 0) { Write-Host "Report verification failed; inspect $report"; exit 1 }
  Write-Host "M56 Windows build verification passed. Report: $report Log: $log"
} catch {
  Write-Error $_.Exception.Message
  exit 1
} finally { Pop-Location }
