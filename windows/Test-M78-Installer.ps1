param([string]$Distribution = '.\dist-m76', [string]$OutputReport = '.\m78-installer-report.json', [switch]$CheckDistribution)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {throw 'Node.js is required'}
$report=if([IO.Path]::IsPathRooted($OutputReport)){$OutputReport}else{Join-Path $root $OutputReport}
$argsList=@((Join-Path $PSScriptRoot 'M78-Installer-Contract.js'),$root,$report)
if($CheckDistribution){
 $dist=if([IO.Path]::IsPathRooted($Distribution)){$Distribution}else{Join-Path $root $Distribution}
 if(-not (Test-Path -LiteralPath $dist -PathType Container)){throw 'Build M76 distribution first'}
 $argsList+= $dist
}
& node @argsList
if($LASTEXITCODE -ne 0){throw "M78 installer contract failed: $report"}
Write-Host "M78 installer contract passed: $report"
