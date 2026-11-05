param([Parameter(Mandatory=$true)][string]$ReleaseTag,[Parameter(Mandatory=$true)][string]$BuildRoot)
$ErrorActionPreference='Stop'
$PSNativeCommandUseErrorActionPreference=$false
$out=Join-Path $BuildRoot 'installers'
$files=@((Join-Path $out 'Windows-integrated-installer-smoke.json'),(Join-Path $out 'Core-safety-results.json'),(Join-Path $out 'SHA256SUMS.txt'))
$files+=@(Get-ChildItem -LiteralPath $out -Filter '*-installed-setup-checks.log' | ForEach-Object FullName)
if ($files.Count -ne 5) { throw 'The complete installed validation reports are required.' }
foreach ($file in $files) { if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw 'Validation report missing.' } }
# Replace only these owned validation reports; never replace the tested EXE assets.
& gh release upload $ReleaseTag --repo $env:GITHUB_REPOSITORY --clobber @files
if ($LASTEXITCODE -ne 0) { throw 'Release report upload failed.' }
& gh release edit $ReleaseTag --repo $env:GITHUB_REPOSITORY --title 'FBS Classroom M184 - Windows installers with integrated lab setup' --notes-file 'M184-START-HERE.md'
if ($LASTEXITCODE -ne 0) { throw 'Release metadata update failed.' }
