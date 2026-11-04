param([switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Write-Host 'FBS Classroom M33 - Windows development smoke tests'
foreach ($name in @('node','dotnet')) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) { throw "Missing required tool: $name" }
}
Push-Location $root
try {
  & node --check (Join-Path $root 'student-agent.js')
  if ($LASTEXITCODE -ne 0) { throw 'student-agent.js syntax check failed' }
  & node --check (Join-Path $root 'teacher-lan.js')
  if ($LASTEXITCODE -ne 0) { throw 'teacher-lan.js syntax check failed' }
  & node --test
  if ($LASTEXITCODE -ne 0) { throw 'Node tests failed' }
  if (-not $SkipBuild) {
    & dotnet build (Join-Path $root 'windows/FBS.Student.Native/FBS.Student.Native.csproj') --configuration Release
    if ($LASTEXITCODE -ne 0) { throw 'Student Windows build failed' }
    & dotnet build (Join-Path $root 'windows/FBS.Teacher.Launcher/FBS.Teacher.Launcher.csproj') --configuration Release
    if ($LASTEXITCODE -ne 0) { throw 'Teacher Windows build failed' }
  }
  & node (Join-Path $root 'tests/m33-demo-smoke.js')
  if ($LASTEXITCODE -ne 0) { throw 'Demo HTTP smoke test failed' }
  Write-Host 'PASS: Windows smoke checks completed. Live lab network is NOT tested.' -ForegroundColor Green
} finally { Pop-Location }
