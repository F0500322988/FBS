# Run in PowerShell on Windows 11 with .NET 8 SDK installed.
$ErrorActionPreference = 'Stop'
$project = Join-Path $PSScriptRoot 'FBS.NativeSafety.Smoke\FBS.NativeSafety.Smoke.csproj'
if (-not $IsWindows -and $PSVersionTable.PSEdition -eq 'Core') { throw 'Windows is required.' }
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) { throw '.NET 8 SDK is required.' }
dotnet run --project $project --configuration Release
if ($LASTEXITCODE -ne 0) { throw "M129 native smoke test failed (exit $LASTEXITCODE)." }
Write-Host 'M129 Windows native smoke test passed. Real remote input remains disabled.'
