# Run on Windows 10/11 with .NET 8 SDK. Builds native Windows UI executables.
param([string]$OutputDirectory = '.\dist')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$target = [System.IO.Path]::GetFullPath((Join-Path $root $OutputDirectory))
New-Item -ItemType Directory -Force -Path $target | Out-Null
$project = Join-Path $PSScriptRoot 'FBS.Student.Native\FBS.Student.Native.csproj'
& dotnet publish $project -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o (Join-Path $target 'Student')
if ($LASTEXITCODE -ne 0) { throw 'Student EXE build failed' }
$teacher = Join-Path $PSScriptRoot 'FBS.Teacher.Launcher\FBS.Teacher.Launcher.csproj'
& dotnet publish $teacher -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o (Join-Path $target 'Teacher')
if ($LASTEXITCODE -ne 0) { throw 'Teacher EXE build failed' }
Write-Host 'EXEs built. Teacher launcher requires Node.js and configured TLS environment variables.'
Write-Host 'Student native EXE is a status UI; existing Node.js agent remains separate.'
Write-Host 'No remote mouse/keyboard control is implemented.'
