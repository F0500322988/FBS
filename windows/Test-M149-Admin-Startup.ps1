param([Parameter(Mandatory=$true)][string]$AdminDirectory)
$ErrorActionPreference = 'Stop'
if (-not $IsWindows -and $PSVersionTable.PSEdition -eq 'Core') { throw 'Windows required.' }
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) { throw '.NET 8 SDK required.' }
$project = Join-Path $PSScriptRoot 'FBS.Admin.Audit/FBS.Admin.Audit.csproj'
if (-not (Test-Path -LiteralPath $AdminDirectory -PathType Container)) { throw 'Existing private administrator directory required.' }
& dotnet run --project $project -- $AdminDirectory
if ($LASTEXITCODE -ne 0) { throw "M149 administrator startup audit failed (exit $LASTEXITCODE)." }
Write-Host 'PASS: M149 administrator startup audit completed.'
