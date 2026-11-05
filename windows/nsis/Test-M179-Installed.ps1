$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_OS -ne 'Windows') { throw 'This installer smoke test is restricted to an isolated GitHub Windows runner.' }
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'The isolated runner must already be elevated.' }
$fixtureBase = [IO.Path]::GetFullPath((Join-Path $env:RUNNER_TEMP ('fbs-m179-installed-' + [Guid]::NewGuid().ToString('N'))))
$runnerBase = [IO.Path]::GetFullPath($env:RUNNER_TEMP).TrimEnd('\') + '\'
if (-not $fixtureBase.StartsWith($runnerBase, [StringComparison]::OrdinalIgnoreCase)) { throw 'Fixture escaped runner temp.' }
New-Item -ItemType Directory $fixtureBase | Out-Null
$results = @()
$hashes = @{ Teacher='63c43c0d61f1f19f9b26b84db47a78706af3fd08c394deda267a7c49b8f239c0'; Student='8c901051ca97e8450518146200e820df9f7762e31820af73e722b49ce57f11d5' }
foreach ($role in @('Teacher','Student')) {
  $registry = if ($role -eq 'Teacher') { 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\FBSClassroom.Teacher.Preview' } else { 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\FBSClassroom.Student.Preview' }
  if (Test-Path $registry) { throw "Refusing to overwrite an existing $role registration." }
  $target = Join-Path $fixtureBase $role
  if (Test-Path $target) { throw 'Target already exists.' }
  $exe = Join-Path $fixtureBase "$role-Setup.exe"
  $url = "https://github.com/F0500322988/FBS/raw/refs/heads/downloads/m179-preview/downloads/M179/FBS-Classroom-$role-M179-Setup-PREVIEW.exe"
  Invoke-WebRequest $url -OutFile $exe
  if ((Get-FileHash $exe -Algorithm SHA256).Hash.ToLowerInvariant() -ne $hashes[$role]) { throw 'Downloaded installer hash mismatch.' }
  $installed = Start-Process -FilePath $exe -ArgumentList @('/S',"/D=$target") -PassThru -Wait
  if ($installed.ExitCode -ne 0) { throw "Installer $role failed: $($installed.ExitCode)" }
  $manifest = Get-Content (Join-Path $PSScriptRoot "m179-ci/payload-$role.json") -Raw | ConvertFrom-Json
  if ($manifest.role -ne $role -or $manifest.version -ne '0.179.0-preview') { throw 'Wrong payload manifest.' }
  $targetPrefix = [IO.Path]::GetFullPath($target).TrimEnd('\') + '\'
  foreach ($file in $manifest.files) {
    $absolute = [IO.Path]::GetFullPath((Join-Path $target $file.path))
    if (-not $absolute.StartsWith($targetPrefix,[StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid manifest path.' }
    $entry = Get-Item -LiteralPath $absolute
    if ($entry.Length -ne $file.size -or ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) -or (Get-FileHash -LiteralPath $absolute -Algorithm SHA256).Hash.ToLowerInvariant() -ne $file.sha256) { throw "Installed payload mismatch: $($file.path)" }
  }
  $all = @(Get-ChildItem -LiteralPath $target -Recurse -File)
  if ($all.Count -ne $manifest.files.Count + 1 -or -not (Test-Path (Join-Path $target 'Uninstall.exe'))) { throw 'Unexpected installed file inventory.' }
  $registered = Get-ItemProperty $registry
  if ($registered.InstallLocation -ne $target -or $registered.DisplayVersion -ne '0.179.0-preview') { throw 'Uninstall registration mismatch.' }
  $node = Join-Path $target 'Runtime/node.exe'
  $version = & $node --version
  if ($LASTEXITCODE -ne 0) { throw 'Installed Node runtime did not execute.' }
  foreach ($script in @('server.js','student-agent.js','classroom-pause.js')) {
    & $node --check (Join-Path $target "Runtime/$script")
    if ($LASTEXITCODE -ne 0) { throw "Installed script did not pass syntax validation: $script" }
  }
  $marker = Join-Path $target 'ci-preserve-unknown-file.txt'
  [IO.File]::WriteAllText($marker,'Owned CI marker: uninstall must preserve unknown files.')
  $markerHash = (Get-FileHash $marker).Hash
  Start-Process -FilePath (Join-Path $target 'Uninstall.exe') -ArgumentList '/S' -PassThru -Wait | Out-Null
  $deadline = [DateTime]::UtcNow.AddSeconds(45)
  do {
    $remaining = @($manifest.files | Where-Object { Test-Path -LiteralPath (Join-Path $target $_.path) })
    if ($remaining.Count -eq 0 -and -not (Test-Path $registry) -and -not (Test-Path (Join-Path $target 'Uninstall.exe'))) { break }
    Start-Sleep -Milliseconds 250
  } while ([DateTime]::UtcNow -lt $deadline)
  if ($remaining.Count -ne 0 -or (Test-Path $registry) -or (Test-Path (Join-Path $target 'Uninstall.exe'))) { throw 'Uninstall did not remove its owned files and registration.' }
  if (-not (Test-Path $marker) -or (Get-FileHash $marker).Hash -ne $markerHash) { throw 'Uninstall changed an unknown file.' }
  $left = @(Get-ChildItem -LiteralPath $target -Recurse -File)
  if ($left.Count -ne 1 -or $left[0].FullName -ne $marker) { throw 'Unexpected files remain; no recursive cleanup will run.' }
  Remove-Item -LiteralPath $marker
  [IO.Directory]::Delete($target) # Empty only; never recursive.
  Remove-Item -LiteralPath $exe
  $results += @{ role=$role; installed=$true; payloadFilesVerified=$manifest.files.Count; nodeVersion=$version; uninstalled=$true; unknownFilePreserved=$true }
}
[IO.Directory]::Delete($fixtureBase)
New-Item -ItemType Directory -Path checks-output -Force | Out-Null
@{stage='M179'; installerExecuted=$true; isolatedGitHubRunner=$true; actualStudentAppGuiTested=$false; installers=$results} | ConvertTo-Json -Depth 5 | Set-Content checks-output/Windows-installer-smoke.json
Write-Output 'Windows M179 installed payload, Node runtime, uninstall and unknown-file preservation checks passed.'
