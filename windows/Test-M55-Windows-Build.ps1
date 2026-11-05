param([string]$ReportPath = '.\m55-windows-build.json')
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$report = [ordered]@{
  stage = 'M55'; generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  machine = $env:COMPUTERNAME; os = [Environment]::OSVersion.VersionString
  passed = $false; osInputEnabled = $false; checks = @(); error = $null
}
function Invoke-Check([string]$Name, [string]$Executable, [string[]]$Arguments) {
  $start = Get-Date
  $check = [ordered]@{ name=$Name; passed=$false; exitCode=$null; durationMs=0 }
  try {
    & $Executable @Arguments
    $code = $LASTEXITCODE
    $check.exitCode = $code
    $check.passed = ($code -eq 0)
    if (-not $check.passed) { throw "$Name exited with code $code" }
  } finally {
    $check.durationMs = [int]((Get-Date) - $start).TotalMilliseconds
    $report.checks += $check
  }
}
Push-Location $root
try {
  if ($env:OS -ne 'Windows_NT') { throw 'This verification must run on Windows' }
  foreach ($command in @('node','dotnet')) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) { throw "$command not installed" }
  }
  Invoke-Check 'Node syntax' 'node' @('--check','student-agent.js')
  Invoke-Check 'Node test suite' 'node' @('--test')
  Invoke-Check 'C# safety tests' 'dotnet' @('run','--project','windows/FBS.NativeGate.Tests/FBS.NativeGate.Tests.csproj','--configuration','Release')
  Invoke-Check 'Student Windows build' 'dotnet' @('build','windows/FBS.Student.Native/FBS.Student.Native.csproj','--configuration','Release','--nologo')
  Invoke-Check 'Teacher Windows build' 'dotnet' @('build','windows/FBS.Teacher.Launcher/FBS.Teacher.Launcher.csproj','--configuration','Release','--nologo')
  $report.passed = $true
} catch {
  $report.error = $_.Exception.Message
  Write-Warning $report.error
} finally {
  Pop-Location
  $path = if ([IO.Path]::IsPathRooted($ReportPath)) { $ReportPath } else { Join-Path $root $ReportPath }
  $folder = Split-Path -Parent $path
  if (-not (Test-Path $folder)) { New-Item -ItemType Directory -Force -Path $folder | Out-Null }
  $report | ConvertTo-Json -Depth 8 | Set-Content -Path $path -Encoding UTF8
  Write-Host "M55 report: $path"
}
if (-not $report.passed) { exit 1 }
