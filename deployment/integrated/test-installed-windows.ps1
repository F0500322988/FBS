param([Parameter(Mandatory=$true)][string]$BuildRoot)
$ErrorActionPreference='Stop'
$PSNativeCommandUseErrorActionPreference=$true
$out=Join-Path $BuildRoot 'installers'
$verification=Get-Content (Join-Path $out 'installer-verification.json') -Raw | ConvertFrom-Json
$fixture=Join-Path $env:TEMP ('FBS-M184-integrated-'+[Guid]::NewGuid().ToString('N'))
if (Test-Path $fixture) { throw 'Fixture already exists.' }
New-Item -ItemType Directory -Path $fixture | Out-Null
Add-Type -AssemblyName System.Drawing
function Test-OfficialIcon([string]$Executable) {
    $actual=[System.Drawing.Icon]::ExtractAssociatedIcon($Executable)
    if ($null -eq $actual) { throw 'Executable icon is missing.' }
    $expected=[System.Drawing.Icon]::new((Join-Path $PWD 'assets/branding/FBS-Classroom.ico'),$actual.Size)
    $actualBitmap=$actual.ToBitmap();$expectedBitmap=$expected.ToBitmap()
    try {
        for ($y=0;$y -lt $actualBitmap.Height;$y++) {
            for ($x=0;$x -lt $actualBitmap.Width;$x++) {
                if ($actualBitmap.GetPixel($x,$y).ToArgb() -ne $expectedBitmap.GetPixel($x,$y).ToArgb()) { throw 'Executable icon differs from the official FBS logo.' }
            }
        }
    } finally { $actualBitmap.Dispose();$expectedBitmap.Dispose();$actual.Dispose();$expected.Dispose() }
}
$results=@()
foreach ($role in @('Teacher','Student')) {
    $registry=if ($role -eq 'Teacher') {'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\FBSClassroom.Teacher.Preview'} else {'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\FBSClassroom.Student.Preview'}
    if (Test-Path $registry) { throw 'Existing application registration; refusing install.' }
    $target=[IO.Path]::GetFullPath((Join-Path $fixture $role))
    $targetPrefix=$target+[IO.Path]::DirectorySeparatorChar
    $entry=$verification.installers | Where-Object role -eq $role
    $exe=Join-Path $out $entry.file
    if ((Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) { throw 'Installer hash mismatch.' }
    Test-OfficialIcon $exe
    $installed=Start-Process -FilePath $exe -ArgumentList @('/S',"/D=$target") -PassThru -Wait
    if ($installed.ExitCode -ne 0) { throw 'Installer execution failed.' }
    $application=if ($role -eq 'Teacher') {'Teacher/FBS.Teacher.exe'} else {'Student/FBS.Student.Native.exe'}
    Test-OfficialIcon (Join-Path $target $application)
    $manifest=Get-Content (Join-Path $out "payload-$role.json") -Raw | ConvertFrom-Json
    if ($manifest.setupBundle -ne 'M184' -or $manifest.version -ne '0.183.0-preview') { throw 'Wrong integrated manifest.' }
    foreach ($file in $manifest.files) {
        $absolute=[IO.Path]::GetFullPath((Join-Path $target $file.path))
        if (-not $absolute.StartsWith($targetPrefix,[StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe installed path.' }
        $item=Get-Item -LiteralPath $absolute
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -or $item.Length -ne $file.size -or (Get-FileHash -LiteralPath $absolute -Algorithm SHA256).Hash.ToLowerInvariant() -ne $file.sha256) { throw 'Installed payload mismatch.' }
    }
    if ((@(Get-ChildItem $target -Recurse -File)).Count -ne $manifest.files.Count+1) { throw 'Unexpected installed file inventory.' }
    $registered=Get-ItemProperty $registry
    if ($registered.SetupBundle -ne 'M184' -or $registered.DisplayVersion -ne '0.183.0-preview') { throw 'Integrated registration mismatch.' }
    if (Test-Path -LiteralPath (Join-Path $target 'SetupKit/lab-profile.json')) { throw 'Private profile included in public installer.' }
    $node=Join-Path $target 'Runtime/node.exe'
    if ((& $node --version) -ne 'v22.23.4') { throw 'Wrong bundled Node version.' }
    foreach ($name in @('server.js','student-agent.js','classroom-assistance.js','classroom-power.js')) { & $node --check (Join-Path $target "Runtime/$name"); if ($LASTEXITCODE -ne 0) { throw 'Installed runtime syntax failed.' } }
    $log=Join-Path $out "$role-installed-setup-checks.log"
    & (Join-Path $target 'SetupKit/FBS-LabSetup-Windows.exe') self-test | Tee-Object $log
    if ($LASTEXITCODE -ne 0) { throw 'Installed M184 helper tests failed.' }
    $tokens=$null;$parseErrors=$null
    [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $target 'SetupKit/Import-Student-Profile.ps1'),[ref]$tokens,[ref]$parseErrors) | Out-Null
    if ($parseErrors.Count) { throw 'Installed profile picker script did not parse.' }
    $programs=if ($role -eq 'Teacher') {[Environment]::GetFolderPath('CommonPrograms')} else {[Environment]::GetFolderPath('Programs')}
    $menu=Join-Path $programs "FBS Classroom $role Preview"
    $shell=New-Object -ComObject WScript.Shell
    $toolLink=Join-Path $menu 'M184 Setup Tools.lnk'
    if (-not (Test-Path -LiteralPath $toolLink) -or $shell.CreateShortcut($toolLink).TargetPath -ne (Join-Path $target 'SetupKit')) { throw 'Setup shortcut missing or wrong.' }
    $action=Join-Path $menu $(if ($role -eq 'Teacher') {'M184 Prepare Students.lnk'} else {'M184 Import Teacher Profile.lnk'})
    if (-not (Test-Path -LiteralPath $action)) { throw 'Setup action shortcut missing.' }
    if ($role -eq 'Student' -and -not $shell.CreateShortcut($action).Arguments.Contains('Import-Student-Profile.ps1')) { throw 'Student profile action is not wired to the picker.' }
    $marker=Join-Path $target 'preserve-user-file.txt';[IO.File]::WriteAllText($marker,'Owned fixture marker; preserve unknown files.');$markerHash=(Get-FileHash $marker).Hash
    Start-Process -FilePath (Join-Path $target 'Uninstall.exe') -ArgumentList '/S' -PassThru -Wait | Out-Null
    $deadline=[DateTime]::UtcNow.AddSeconds(45)
    do {
        $remaining=@($manifest.files | Where-Object {Test-Path -LiteralPath (Join-Path $target $_.path)})
        if ($remaining.Count -eq 0 -and -not (Test-Path $registry) -and -not (Test-Path (Join-Path $target 'Uninstall.exe'))) { break }
        Start-Sleep -Milliseconds 250
    } while ([DateTime]::UtcNow -lt $deadline)
    if ($remaining.Count -or (Test-Path $registry) -or (Test-Path (Join-Path $target 'Uninstall.exe'))) { throw 'Uninstall did not remove its owned payload.' }
    if ((Get-FileHash $marker).Hash -ne $markerHash -or @(Get-ChildItem $target -Recurse -File).Count -ne 1) { throw 'Unknown-file preservation failed.' }
    if (Test-Path -LiteralPath $action) { throw 'Owned setup shortcut remained after uninstall.' }
    Remove-Item -LiteralPath $marker
    [IO.Directory]::Delete($target)
    $results+=@{officialIconVerified=$true;role=$role;installed=$true;setupBundle='M184';payloadFilesVerified=$manifest.files.Count;embeddedHelperChecks=39;embeddedHelperExecuted=$true;profilePickerParsed=$true;profilePickerGuiTested=$false;shortcutsVerified=$true;uninstalled=$true;unknownFilePreserved=$true;actualStudentAppGuiTested=$false}
}
[IO.Directory]::Delete($fixture)
@{stage='M184';coreVersion='0.183.0-preview';installerExecuted=$true;isolatedRunner=$true;privateProfilesPackaged=$false;installers=$results} | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $out 'Windows-integrated-installer-smoke.json')
$verification.installers | ForEach-Object { "$($_.sha256)  $($_.file)" } | Set-Content (Join-Path $out 'SHA256SUMS.txt')
