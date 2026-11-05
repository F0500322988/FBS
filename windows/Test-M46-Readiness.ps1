param([string]$ReportPath = ".\m46-readiness.json")
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$report = [ordered]@{
    stage = "M46"; timestamp = (Get-Date).ToUniversalTime().ToString("o")
    realWindowsTwoPc = $false
    nodeTests = "not-run"; nativeTests = "not-run"; studentBuild = "not-run"; teacherBuild = "not-run"
    tlsPinVerified = "not-run"; studentConsentObserved = "not-run"
    studentStopObserved = "not-run"; disconnectStopObserved = "not-run"
    note = "Automated build checks only. Two-PC checks require separate observed evidence. No input enabled."
}
Push-Location $root
try {
    node --test
    if ($LASTEXITCODE -ne 0) { throw "Node tests failed" }
    $report.nodeTests = "passed"
    dotnet run --project .\windows\FBS.NativeGate.Tests\FBS.NativeGate.Tests.csproj --configuration Release
    if ($LASTEXITCODE -ne 0) { throw "Native tests failed" }
    $report.nativeTests = "passed"
    dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj --configuration Release
    if ($LASTEXITCODE -ne 0) { throw "Student build failed" }
    $report.studentBuild = "passed"
    dotnet build .\windows\FBS.Teacher.Launcher\FBS.Teacher.Launcher.csproj --configuration Release
    if ($LASTEXITCODE -ne 0) { throw "Teacher build failed" }
    $report.teacherBuild = "passed"
} catch {
    $report.error = $_.Exception.Message
    Write-Warning $_.Exception.Message
} finally {
    Pop-Location
    $report.timestamp = (Get-Date).ToUniversalTime().ToString("o")
    $report | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 $ReportPath
    Write-Host "Saved $ReportPath. This is NOT authorization to enable remote input."
}
# Never mark physical tests passed automatically.
if ($report.nodeTests -ne "passed" -or $report.nativeTests -ne "passed" -or $report.studentBuild -ne "passed" -or $report.teacherBuild -ne "passed") { exit 1 }
