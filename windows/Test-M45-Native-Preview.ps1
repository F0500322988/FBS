param([string]$ReportPath = ".\m45-native-preview.json")
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$report = [ordered]@{ stage = "M45"; timestamp = (Get-Date).ToUniversalTime().ToString("o"); nodeTests = "not-run"; nativeTests = "not-run"; studentBuild = "not-run"; success = $false }
try {
    Push-Location $root
    node --test
    if ($LASTEXITCODE -ne 0) { throw "Node tests failed" }
    $report.nodeTests = "passed"
    dotnet run --project .\windows\FBS.NativeGate.Tests\FBS.NativeGate.Tests.csproj --configuration Release
    if ($LASTEXITCODE -ne 0) { throw "Native gate tests failed" }
    $report.nativeTests = "passed"
    dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj --configuration Release
    if ($LASTEXITCODE -ne 0) { throw "Student build failed" }
    $report.studentBuild = "passed"
    $report.success = $true
} catch { $report.error = $_.Exception.Message; Write-Error $_.Exception.Message }
finally {
    Pop-Location
    $report | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 $ReportPath
}
if (-not $report.success) { exit 1 }
