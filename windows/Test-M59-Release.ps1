param([string]$OutputDirectory = '.\dist-m59', [string]$ReportPath = '.\m59-release.json')
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$out = if ([IO.Path]::IsPathRooted($OutputDirectory)) { $OutputDirectory } else { Join-Path $root $OutputDirectory }
$reportFile = if ([IO.Path]::IsPathRooted($ReportPath)) { $ReportPath } else { Join-Path $root $ReportPath }
$report = [ordered]@{ stage='M59'; generatedAt=(Get-Date).ToUniversalTime().ToString('o'); passed=$false; liveInputEnabled=$false; artifacts=@(); checks=@(); error=$null }
function Check([string]$name, [scriptblock]$action) {
  $entry=[ordered]@{ name=$name; passed=$false }
  try { & $action; if ($LASTEXITCODE -is [int] -and $LASTEXITCODE -ne 0) { throw "$name failed ($LASTEXITCODE)" }; $entry.passed=$true }
  finally { $report.checks += $entry }
}
Push-Location $root
try {
  if ($env:OS -ne 'Windows_NT') { throw 'M59 release build requires Windows' }
  foreach ($command in @('node','dotnet')) { if (-not (Get-Command $command -ErrorAction SilentlyContinue)) { throw "Missing $command" } }
  Check 'JavaScript syntax' { & node --check student-agent.js }
  Check 'JavaScript tests' { & node --test }
  Check 'Native safety tests' { & dotnet run --project windows/FBS.NativeGate.Tests/FBS.NativeGate.Tests.csproj -c Release }
  Check 'Publish student EXE' { & dotnet publish windows/FBS.Student.Native/FBS.Student.Native.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o (Join-Path $out 'Student') }
  Check 'Publish teacher EXE' { & dotnet publish windows/FBS.Teacher.Launcher/FBS.Teacher.Launcher.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o (Join-Path $out 'Teacher') }
  foreach ($item in @(@('Student','FBS.Student.Native.exe'),@('Teacher','FBS.Teacher.exe'))) {
    $file=Join-Path (Join-Path $out $item[0]) $item[1]
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Missing published EXE: $file" }
    $f=Get-Item -LiteralPath $file
    if ($f.Length -lt 1024) { throw "Published EXE unexpectedly small: $file" }
    $report.artifacts += [ordered]@{ role=$item[0]; name=$item[1]; sizeBytes=$f.Length; sha256=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() }
  }
  $report.passed=$true
} catch { $report.error=$_.Exception.Message; Write-Warning $report.error }
finally {
  Pop-Location
  $parent=Split-Path -Parent $reportFile
  if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
  $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportFile -Encoding UTF8
  Write-Host "M59 report: $reportFile"
}
if (-not $report.passed) { exit 1 }
