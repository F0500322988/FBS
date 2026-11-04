param([string]$ReportPath = ".\m38-one-student.json")
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$results = [ordered]@{ stage = 'M38'; mode = 'one-student-local-simulation'; time = (Get-Date).ToString('o'); checks = @(); passed = $false; osInputEnabled = $false }
function Run-Check([string]$name, [string]$exe, [string[]]$arguments) {
  Push-Location $root
  try {
    & $exe @arguments
    $ok = $LASTEXITCODE -eq 0
    $results.checks += @{ name = $name; passed = $ok }
    if (-not $ok) { throw "$name failed (exit $LASTEXITCODE)" }
  } finally { Pop-Location }
}
try {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is required' }
  if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) { throw '.NET 8 SDK is required' }
  Run-Check 'Node automated tests' 'node' @('--test')
  Run-Check 'Native consent/stop/replay simulation' 'dotnet' @('run','--project','windows/FBS.NativeGate.Tests/FBS.NativeGate.Tests.csproj','--configuration','Release')
  Run-Check 'Student native build' 'dotnet' @('build','windows/FBS.Student.Native/FBS.Student.Native.csproj','--configuration','Release')
  $results.passed = $true
} catch { $results.error = $_.Exception.Message; Write-Error $_.Exception.Message -ErrorAction Continue }
finally {
  $path = if ([IO.Path]::IsPathRooted($ReportPath)) { $ReportPath } else { Join-Path $root $ReportPath }
  $results | ConvertTo-Json -Depth 6 | Set-Content -Path $path -Encoding UTF8
  Write-Host "M38 report: $path"
}
if (-not $results.passed) { exit 1 }
