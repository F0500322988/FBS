param([string]$OutputDirectory = '.\release')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$target = [IO.Path]::GetFullPath((Join-Path $root $OutputDirectory))
if (Test-Path -LiteralPath $target) { throw 'Choose a new output directory; refusing to mix a release with existing files.' }
$node = Get-Command node.exe -ErrorAction Stop
$dotnet = Get-Command dotnet.exe -ErrorAction Stop
New-Item -ItemType Directory -Force -Path $target | Out-Null
$runtime = Join-Path $target 'Runtime'
New-Item -ItemType Directory -Force -Path $runtime | Out-Null
# Keep the complete set of local modules required by the server and student agent.
Get-ChildItem -LiteralPath $root -Filter '*.js' -File | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $runtime -Force }
Copy-Item (Join-Path $PSScriptRoot 'Start-Student-Agent.ps1') (Join-Path $runtime 'Start-Student-Agent.ps1') -Force
Copy-Item (Join-Path $root 'public') (Join-Path $runtime 'public') -Recurse -Force
# Node executable must be the Windows binary. Do not bundle a Linux executable.
Copy-Item $node.Source (Join-Path $runtime 'node.exe') -Force
$notices = Join-Path $runtime 'ThirdParty-Licenses'
New-Item -ItemType Directory -Force -Path $notices | Out-Null
$nodeLicense = @('LICENSE','LICENSE.txt') | ForEach-Object { Join-Path (Split-Path -Parent $node.Source) $_ } | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not $nodeLicense) { throw 'Node.js distribution license is missing; use an official Node distribution.' }
Copy-Item -LiteralPath $nodeLicense -Destination (Join-Path $notices 'Node-LICENSE.txt')
$teacher = Join-Path $PSScriptRoot 'FBS.Teacher.Launcher\FBS.Teacher.Launcher.csproj'
$student = Join-Path $PSScriptRoot 'FBS.Student.Native\FBS.Student.Native.csproj'
& $dotnet.Source publish $teacher -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o (Join-Path $target 'Teacher')
if ($LASTEXITCODE -ne 0) { throw 'Teacher build failed' }
& $dotnet.Source publish $student -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o (Join-Path $target 'Student')
if ($LASTEXITCODE -ne 0) { throw 'Student build failed' }
$packageLocation = & $dotnet.Source nuget locals global-packages --list --force-english-output
if ($LASTEXITCODE -ne 0) { throw 'Could not locate runtime package licenses' }
$packageRoot = ($packageLocation | Where-Object { $_ -match '^global-packages:' } | Select-Object -First 1) -replace '^global-packages:\s*',''
if (-not $packageRoot) { throw 'Runtime package cache location is missing' }
foreach ($package in @('microsoft.netcore.app.runtime.win-x64','microsoft.windowsdesktop.app.runtime.win-x64')) {
  $copied = $false
  foreach ($version in (Get-ChildItem -LiteralPath (Join-Path $packageRoot $package) -Directory)) {
    foreach ($name in @('LICENSE','LICENSE.TXT','THIRD-PARTY-NOTICES.TXT')) {
      $license = Join-Path $version.FullName $name
      if (Test-Path -LiteralPath $license -PathType Leaf) {
        Copy-Item -LiteralPath $license -Destination (Join-Path $notices "$package-$($version.Name)-$name")
        $copied = $true
      }
    }
  }
  if (-not $copied) { throw "Redistribution notices missing for $package" }
}
Copy-Item (Join-Path $PSScriptRoot 'Install-Student.ps1') (Join-Path $target 'Install-Student.ps1') -Force
Copy-Item (Join-Path $PSScriptRoot 'Uninstall-Student.ps1') (Join-Path $target 'Uninstall-Student.ps1') -Force
Copy-Item (Join-Path $PSScriptRoot 'Start-Demo.cmd') (Join-Path $target 'Start-Demo.cmd') -Force
Copy-Item (Join-Path $PSScriptRoot 'Configure-Student.ps1') (Join-Path $target 'Configure-Student.ps1') -Force
& $node.Source (Join-Path $PSScriptRoot 'Verify-M60-Runtime.js') $target
if ($LASTEXITCODE -ne 0) { throw 'Release runtime is incomplete' }
Write-Host "Release assembled at $target"
Write-Host 'This is a developer build, NOT a complete student installer or remote-control EXE.'
