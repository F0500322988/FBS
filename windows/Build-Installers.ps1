param([string]$InnoCompiler = '', [string]$OutputDirectory = '.\release', [string]$PackageDirectory = '.\release-packages')
$ErrorActionPreference = 'Stop'
$root=Split-Path -Parent $PSScriptRoot
if (-not $InnoCompiler) {
  $candidates=@("${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe", "${env:ProgramFiles}\Inno Setup 6\ISCC.exe")
  $InnoCompiler=$candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $InnoCompiler -or -not (Test-Path $InnoCompiler)) { throw 'Install Inno Setup 6, or supply -InnoCompiler path to ISCC.exe' }
& (Join-Path $PSScriptRoot 'Build-Release.ps1') -OutputDirectory $OutputDirectory
if ($LASTEXITCODE -ne 0) { throw 'Build-Release failed' }
& (Join-Path $PSScriptRoot 'Build-M76-Packages.ps1') -Distribution $OutputDirectory -OutputDirectory $PackageDirectory
$stage = if ([IO.Path]::IsPathRooted($PackageDirectory)) { $PackageDirectory } else { Join-Path $root $PackageDirectory }
foreach($name in @('M76-Teacher.iss','M76-Student.iss')) {
  & $InnoCompiler "/DStageRoot=$stage" (Join-Path $PSScriptRoot "installer\$name")
  if ($LASTEXITCODE -ne 0) { throw "Inno Setup compilation failed: $name" }
}
Write-Host "Preview installers created in $stage"
