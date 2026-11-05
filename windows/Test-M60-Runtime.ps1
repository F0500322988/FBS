param([string]$OutputDirectory = '.\dist-m60', [string]$ReportPath = '.\m60-runtime.json')
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$out = if ([IO.Path]::IsPathRooted($OutputDirectory)) { $OutputDirectory } else { Join-Path $root $OutputDirectory }
$reportFile = if ([IO.Path]::IsPathRooted($ReportPath)) { $ReportPath } else { Join-Path $root $ReportPath }
$report = [ordered]@{ stage='M60'; generatedAt=(Get-Date).ToUniversalTime().ToString('o'); passed=$false; liveInputEnabled=$false; checks=@(); artifacts=@(); error=$null }
function Step([string]$name, [scriptblock]$action) {
  $item=[ordered]@{ name=$name; passed=$false; error=$null }
  try { & $action; if ($LASTEXITCODE -is [int] -and $LASTEXITCODE -ne 0) { throw "$name exited with $LASTEXITCODE" }; $item.passed=$true }
  catch { $item.error=$_.Exception.Message; throw }
  finally { $report.checks += $item }
}
Push-Location $root
try {
  if ($env:OS -ne 'Windows_NT') { throw 'Windows 11 / Windows required for native release' }
  foreach ($command in @('node.exe','dotnet.exe')) { if (-not (Get-Command $command -ErrorAction SilentlyContinue)) { throw "Missing $command" } }
  Step 'Node tests' { & node --test }
  Step 'Native C# tests' { & dotnet run --project windows/FBS.NativeGate.Tests/FBS.NativeGate.Tests.csproj -c Release }
  Step 'Student publish' { & dotnet publish windows/FBS.Student.Native/FBS.Student.Native.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o (Join-Path $out 'Student') }
  Step 'Teacher publish' { & dotnet publish windows/FBS.Teacher.Launcher/FBS.Teacher.Launcher.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o (Join-Path $out 'Teacher') }
  Step 'Assemble shared Runtime' {
    $runtime=Join-Path $out 'Runtime'
    New-Item -ItemType Directory -Force -Path $runtime | Out-Null
    Get-ChildItem -LiteralPath $root -Filter '*.js' -File | Where-Object { $_.Name -notlike '*test*' } | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $runtime -Force }
    Copy-Item -LiteralPath (Join-Path $root 'public') -Destination (Join-Path $runtime 'public') -Recurse -Force
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Start-Student-Agent.ps1') -Destination $runtime -Force
    $node=(Get-Command node.exe).Source
    Copy-Item -LiteralPath $node -Destination (Join-Path $runtime 'node.exe') -Force
    & (Join-Path $runtime 'node.exe') --check (Join-Path $runtime 'server.js')
    if ($LASTEXITCODE -ne 0) { throw 'Packaged server syntax failed' }
  }
  Step 'Verify complete distribution' {
    & node (Join-Path $PSScriptRoot 'Verify-M60-Runtime.js') $out
    if ($LASTEXITCODE -ne 0) { throw 'Incomplete distribution' }
  }
  foreach ($relative in @('Teacher/FBS.Teacher.exe','Student/FBS.Student.Native.exe','Runtime/node.exe','Runtime/server.js','Runtime/student-agent.js')) {
    $file=Join-Path $out $relative
    $f=Get-Item -LiteralPath $file
    $report.artifacts += [ordered]@{ path=$relative; sizeBytes=$f.Length; sha256=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() }
  }
  $report.passed=$true
} catch { $report.error=$_.Exception.Message; Write-Warning $report.error }
finally {
  Pop-Location
  $parent=Split-Path -Parent $reportFile
  if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
  $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportFile -Encoding UTF8
  Write-Host "M60 report: $reportFile"
}
if (-not $report.passed) { exit 1 }
