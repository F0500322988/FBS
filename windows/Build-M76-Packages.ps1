param([string]$Distribution = '.\dist-m60', [string]$OutputDirectory = '.\dist-m76', [switch]$BuildInstallers)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
function AbsolutePath([string]$p) { if ([IO.Path]::IsPathRooted($p)) {return $p}; return (Join-Path $root $p) }
if ($env:OS -ne 'Windows_NT') { throw 'M76 packaging requires Windows.' }
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { throw 'Node.js required to verify packages.' }
$source=AbsolutePath $Distribution
$dest=AbsolutePath $OutputDirectory
if (-not (Test-Path -LiteralPath $source -PathType Container)) { throw 'Build M60 runtime first.' }
if ([IO.Path]::GetFullPath($source).TrimEnd('\') -eq [IO.Path]::GetFullPath($dest).TrimEnd('\')) {throw 'Output must differ from source.'}
if (Test-Path -LiteralPath $dest) { throw 'Output directory already exists; choose a fresh destination to avoid stale files.' }
New-Item -ItemType Directory -Path $dest -Force | Out-Null
$results=@()
foreach ($role in @('Teacher','Student')) {
  $stage=Join-Path $dest $role
  New-Item -ItemType Directory -Path $stage -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $source $role) -Destination (Join-Path $stage $role) -Recurse
  Copy-Item -LiteralPath (Join-Path $source 'Runtime') -Destination (Join-Path $stage 'Runtime') -Recurse
  if ($role -eq 'Student') { Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Configure-Student.ps1') -Destination $stage }
  $report=Join-Path $dest "m76-$($role.ToLowerInvariant())-report.json"
  & node (Join-Path $PSScriptRoot 'M76-Package-Check.js') $stage $role $report
  if ($LASTEXITCODE -ne 0) {throw "M76 $role package incomplete; see $report"}
  $zip=Join-Path $dest "FBS-Classroom-$role-M170-Portable.zip"
  Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -CompressionLevel Optimal
  $results += [ordered]@{role=$role;portableZip=$zip;sha256=(Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()}
}
if ($BuildInstallers) {
  $iscc=Get-Command ISCC.exe -ErrorAction SilentlyContinue
  if (-not $iscc) {throw 'Inno Setup ISCC.exe not found; portable ZIPs were created.'}
  foreach ($role in @('Teacher','Student')) {
    $script=Join-Path $PSScriptRoot "installer\M76-$role.iss"
    & $iscc.Source "/DStageRoot=$dest" $script
    if ($LASTEXITCODE -ne 0) {throw "Inno Setup failed for $role"}
  }
}
[ordered]@{stage='M76';passed=$true;installerBuildRequested=[bool]$BuildInstallers;packages=$results} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $dest 'm76-summary.json') -Encoding UTF8
Write-Host "M76 packages: $dest"
