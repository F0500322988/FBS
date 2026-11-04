param([string]$ReportPath = '.\m57-diagnostics.json', [string]$LogPath = '.\m57-diagnostics.log')
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$reportFile = if ([IO.Path]::IsPathRooted($ReportPath)) { $ReportPath } else { Join-Path $root $ReportPath }
$logFile = if ([IO.Path]::IsPathRooted($LogPath)) { $LogPath } else { Join-Path $root $LogPath }
$report = [ordered]@{ stage='M57'; generatedAt=(Get-Date).ToUniversalTime().ToString('o'); machine=$env:COMPUTERNAME; platform=[Environment]::OSVersion.VersionString; passed=$false; inputExecutionEnabled=$false; checks=@(); failure=$null }
$lines = New-Object 'System.Collections.Generic.List[string]'
function Check([string]$Name, [scriptblock]$Action) {
  $item=[ordered]@{name=$Name;passed=$false;detail=''}
  try { $detail = & $Action; $item.passed=$true; $item.detail=($detail | Out-String).Trim() }
  catch { $item.detail=$_.Exception.Message; if (-not $report.failure) { $report.failure=$Name } }
  $report.checks += $item
  $lines.Add("$Name : $($item.passed) : $($item.detail)")
}
try {
  Check 'Windows host' { if ($env:OS -ne 'Windows_NT') { throw 'Requires Windows 11' }; [Environment]::OSVersion.VersionString }
  Check 'Node installed' { $cmd=Get-Command node -ErrorAction Stop; & $cmd.Source --version; if ($LASTEXITCODE -ne 0) { throw 'node --version failed' } }
  Check '.NET SDK 8 installed' { $cmd=Get-Command dotnet -ErrorAction Stop; $sdks=(& $cmd.Source --list-sdks) -join "`n"; if ($LASTEXITCODE -ne 0 -or $sdks -notmatch '(?m)^8\.') { throw '.NET 8 SDK is missing' }; $sdks }
  Check 'Required projects' {
    foreach ($p in @('windows/FBS.NativeGate.Tests/FBS.NativeGate.Tests.csproj','windows/FBS.Student.Native/FBS.Student.Native.csproj','windows/FBS.Teacher.Launcher/FBS.Teacher.Launcher.csproj')) {
      if (-not (Test-Path (Join-Path $root $p))) { throw "Missing $p" }
    }; 'All three C# projects present'
  }
  Check 'Input remains disabled' {
    $source=Get-Content (Join-Path $root 'windows/FBS.Student.Native/WindowsInputAdapter.cs') -Raw
    if ($source -notmatch 'EnableForVerifiedSession' -or $source -notmatch 'return false;') { throw 'Manual review required: input adapter disable guard missing' }
    'Static check only; does not establish runtime safety'
  }
  if ($report.checks | Where-Object { -not $_.passed }) { $report.passed=$false }
  else {
    Push-Location $root
    try {
      Check 'M56 build and tests' {
        $oldReport=Join-Path $root 'm57-m56-build.json'
        $oldLog=Join-Path $root 'm57-m56-build.log'
        & powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File (Join-Path $PSScriptRoot 'Test-M56-Windows.ps1') -ReportPath $oldReport -LogPath $oldLog
        if ($LASTEXITCODE -ne 0) { throw "Build failed; inspect $oldLog and $oldReport" }
        'M56 tests and both C# builds succeeded'
      }
    } finally { Pop-Location }
    $report.passed = -not [bool]($report.checks | Where-Object { -not $_.passed })
  }
} catch { $report.failure=$_.Exception.Message }
finally {
  foreach ($path in @($reportFile,$logFile)) { $parent=Split-Path -Parent $path; if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null } }
  $report | ConvertTo-Json -Depth 8 | Set-Content -Path $reportFile -Encoding UTF8
  $lines | Set-Content -Path $logFile -Encoding UTF8
  Write-Host "Report: $reportFile; Log: $logFile; Passed: $($report.passed)"
}
if (-not $report.passed) { exit 1 }
