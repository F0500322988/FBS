$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is required' }
    if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) { throw '.NET 8 SDK is required' }
    node --test
    if ($LASTEXITCODE -ne 0) { throw 'Node tests failed' }
    dotnet run --project .\windows\FBS.NativeGate.Tests\FBS.NativeGate.Tests.csproj
    if ($LASTEXITCODE -ne 0) { throw 'Native gate tests failed' }
    dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj -p:EnableWindowsTargeting=true
    if ($LASTEXITCODE -ne 0) { throw 'Native student build failed' }
    Write-Host 'M49 checks passed. Native input injection remains disabled.'
} finally { Pop-Location }
