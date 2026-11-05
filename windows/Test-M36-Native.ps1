param([switch]$SkipNodeTests)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) { throw 'Install .NET 8 SDK first' }
Push-Location $root
try {
  if (-not $SkipNodeTests) {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js first' }
    & node --test
    if ($LASTEXITCODE -ne 0) { throw 'Node tests failed' }
  }
  & dotnet run --project .\windows\FBS.NativeGate.Tests\FBS.NativeGate.Tests.csproj --configuration Release
  if ($LASTEXITCODE -ne 0) { throw 'Native gate tests failed' }
  & dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj --configuration Release
  if ($LASTEXITCODE -ne 0) { throw 'Windows student build failed' }
  Write-Host 'M36 native checks passed. Windows remote input is NOT enabled.' -ForegroundColor Green
} finally { Pop-Location }
