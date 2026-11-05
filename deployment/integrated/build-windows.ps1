param([Parameter(Mandatory=$true)][string]$OutputRoot)
$ErrorActionPreference='Stop'
$PSNativeCommandUseErrorActionPreference=$true
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$root=[IO.Path]::GetFullPath($OutputRoot)
if (Test-Path -LiteralPath $root) { throw 'Choose a new build directory.' }
New-Item -ItemType Directory -Path $root | Out-Null
$stage=Join-Path $root 'stage';$out=Join-Path $root 'installers'
New-Item -ItemType Directory -Path $stage,$out | Out-Null
function Get-RepositorySourceSha256([string]$Relative) {
    $start=New-Object System.Diagnostics.ProcessStartInfo
    $start.FileName='git';$start.UseShellExecute=$false;$start.CreateNoWindow=$true
    $start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
    foreach ($argument in @('-C',$repo,'show',"HEAD:$Relative")) { $start.ArgumentList.Add($argument) }
    $process=New-Object System.Diagnostics.Process;$process.StartInfo=$start
    $bytes=New-Object System.IO.MemoryStream
    try {
        if (-not $process.Start()) { throw 'Cannot read canonical repository source.' }
        $process.StandardOutput.BaseStream.CopyTo($bytes);$process.WaitForExit()
        if ($process.ExitCode -ne 0) { throw 'Canonical source object missing.' }
        $hash=[Security.Cryptography.SHA256]::Create()
        try { return [Convert]::ToHexString($hash.ComputeHash($bytes.ToArray())).ToLowerInvariant() } finally { $hash.Dispose() }
    } finally { $bytes.Dispose();$process.Dispose() }
}
$baseline=@{Teacher='58df89a0b0ec9bdca1551c57fdd8552706ab66d7e04c11275ee41589a8d48851';Student='2a7cb40cf74ca69dc07953de5e1ff8b8d5e9c9069c5bb666892ee00d2de667d7'}
foreach ($role in @('Teacher','Student')) {
    $exe=Join-Path $root "$role-M183.exe"
    Invoke-WebRequest "https://github.com/F0500322988/FBS/raw/refs/heads/downloads/m183-preview/downloads/M183/FBS-Classroom-$role-M183-Setup-PREVIEW.exe" -OutFile $exe
    if ((Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant() -ne $baseline[$role]) { throw 'Baseline installer hash mismatch.' }
    $expanded=Join-Path $root "baseline-$role"
    & 'C:/Program Files/7-Zip/7z.exe' x $exe "-o$expanded" -y | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Baseline extraction failed.' }
    $manifest=Get-Content (Join-Path $repo "windows/nsis/m183-ci/payload-$role.json") -Raw | ConvertFrom-Json
    if ($manifest.role -ne $role -or $manifest.version -ne '0.183.0-preview') { throw 'Wrong baseline manifest.' }
    foreach ($file in $manifest.files) {
        if ($file.path -match '(^/|\\|(^|/)\.\.(/|$))') { throw 'Unsafe manifest path.' }
        $source=[IO.Path]::GetFullPath((Join-Path $expanded $file.path))
        if (-not $source.StartsWith($expanded.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe expanded path.' }
        $info=Get-Item -LiteralPath $source
        if (($info.Attributes -band [IO.FileAttributes]::ReparsePoint) -or $info.Length -ne $file.size -or (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -ne $file.sha256) { throw 'Baseline payload mismatch.' }
        # Shared runtime source must match this checkout, rather than silently shipping an old UI.
        if ($file.path -match '^Runtime/(public/.*|[^/]+\.js)$') {
            $current=Join-Path $repo ($file.path.Substring(8))
            if (-not (Test-Path -LiteralPath $current) -or (Get-RepositorySourceSha256 $file.path.Substring(8)) -ne $file.sha256) { throw ('Canonical source differs from the pinned core: '+$file.path) }
        }
        $target=Join-Path (Join-Path $stage $role) $file.path
        New-Item -ItemType Directory -Path (Split-Path $target) -Force | Out-Null
        Copy-Item -LiteralPath $source -Destination $target
    }
}
$kit=Join-Path $root 'public-kit'
python (Join-Path $repo 'deployment/integrated/fetch-kit.py') $kit
if ($LASTEXITCODE -ne 0) { throw 'Pinned M184 kit failed validation.' }
Copy-Item -LiteralPath (Join-Path $repo 'deployment/integrated/Import-Student-Profile.ps1') -Destination $kit
foreach ($role in @('Teacher','Student')) { Copy-Item -LiteralPath $kit -Destination (Join-Path (Join-Path $stage $role) 'SetupKit') -Recurse }
$nsis=Join-Path ${env:ProgramFiles(x86)} 'NSIS/makensis.exe'
if (-not (Test-Path -LiteralPath $nsis)) {
    choco install nsis --version=3.11 -y --no-progress --limit-output
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $nsis)) { throw 'NSIS compiler unavailable.' }
}
node (Join-Path $repo 'windows/nsis/prepare-manifests.js') $stage
if ($LASTEXITCODE -ne 0) { throw 'Payload manifest generation failed.' }
foreach ($role in @('Teacher','Student')) {
    & $nsis '/INPUTCHARSET' 'UTF8' '/V3' "-DStageRoot=$stage" "-DOutputRoot=$out" "-DRole=$role" '-DReleaseStage=M184' "-DDeleteManifest=$(Join-Path $stage "delete-$role.nsh")" (Join-Path $repo 'windows/nsis/Installer.nsi')
    if ($LASTEXITCODE -ne 0) { throw 'NSIS compilation failed.' }
    & 'C:/Program Files/7-Zip/7z.exe' x (Join-Path $out "FBS-Classroom-$role-M184-Setup-PREVIEW.exe") "-o$(Join-Path $out "extracted-$role")" -y | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'New installer extraction failed.' }
}
$env:FBS_NSIS_PLATFORM='windows'
node (Join-Path $repo 'windows/nsis/verify-payload.js') $stage $out M184
if ($LASTEXITCODE -ne 0) { throw 'New installer verification failed.' }
foreach ($role in @('Teacher','Student')) { Copy-Item -LiteralPath (Join-Path $stage "payload-$role.json") -Destination $out }
