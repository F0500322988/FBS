# M132: Execute on Windows 11 with .NET 8 SDK. No real mouse or keyboard input is sent.
$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSEdition -eq 'Core' -and -not $IsWindows) { throw 'Windows is required.' }
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) { throw '.NET 8 SDK is required.' }
$project = Join-Path $PSScriptRoot 'FBS.NativeSafety.Smoke\FBS.NativeSafety.Smoke.csproj'
dotnet run --project $project --configuration Release
if ($LASTEXITCODE -ne 0) { throw "M132 persisted restart safety test failed (exit $LASTEXITCODE)." }
Write-Host 'PASS: M132 isolated persisted-stop restart test completed. Real remote input remains disabled.'
