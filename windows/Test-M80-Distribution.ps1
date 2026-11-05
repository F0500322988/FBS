param([string]$Distribution = '.\dist-m76', [string]$OutputReport = '.\m80-distribution.json', [switch]$RequireInstallers)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { throw 'Node.js is required.' }
function ResolveProjectPath([string]$p) { if ([IO.Path]::IsPathRooted($p)) { return $p }; return Join-Path $root $p }
$dir = ResolveProjectPath $Distribution
$report = ResolveProjectPath $OutputReport
$argsList = @((Join-Path $PSScriptRoot 'M80-Distribution-Gate.js'), $dir, $report)
if ($RequireInstallers) { $argsList += '--require-installers' }
& node.exe @argsList
if ($LASTEXITCODE -ne 0) { throw "M80 distribution validation failed. See $report" }
Write-Host "M80 distribution verified: $report"
