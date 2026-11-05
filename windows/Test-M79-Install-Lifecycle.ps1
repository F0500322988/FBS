param(
  [Parameter(Mandatory=$true)][ValidateSet('Teacher','Student')][string]$Role,
  [Parameter(Mandatory=$true)][ValidateSet('Installed','Uninstalled')][string]$Phase,
  [string]$InstallDirectory = '',
  [string]$OutputReport = ''
)
$ErrorActionPreference='Stop'
if(-not $IsWindows -and $PSVersionTable.PSEdition -eq 'Core'){throw 'Windows is required'}
$exeName=if($Role -eq 'Teacher'){'FBS.Teacher.exe'}else{'FBS.Student.Native.exe'}
$subdir=$Role
$appName="FBS Classroom $Role"
if(-not $InstallDirectory){
  $InstallDirectory=if($Role -eq 'Teacher') {Join-Path $env:ProgramFiles 'FBS Classroom Teacher'} else {Join-Path $env:LOCALAPPDATA 'Programs\FBS Classroom Student'}
}
$exe=Join-Path (Join-Path $InstallDirectory $subdir) $exeName
$shortcuts=@((Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\FBS Classroom\FBS Classroom $Role.lnk"))
if($env:ProgramData){$shortcuts+=Join-Path $env:ProgramData "Microsoft\Windows\Start Menu\Programs\FBS Classroom\FBS Classroom $Role.lnk"}
$shortcut= $shortcuts | Where-Object {Test-Path -LiteralPath $_ -PathType Leaf} | Select-Object -First 1
$targetMatches=$false
if($shortcut){
  $shell=New-Object -ComObject WScript.Shell
  $target=$shell.CreateShortcut($shortcut).TargetPath
  $targetMatches=([IO.Path]::GetFullPath($target) -ieq [IO.Path]::GetFullPath($exe))
}
$uninstallRoots=@('HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall','HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall')
$entries=@(foreach($root in $uninstallRoots){if(Test-Path $root){Get-ChildItem $root -ErrorAction SilentlyContinue | ForEach-Object {Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue} | Where-Object {$_.DisplayName -like "$appName*"}}})
$entry=$entries | Select-Object -First 1
$checks=[ordered]@{
 installedExe=(Test-Path -LiteralPath $exe -PathType Leaf)
 startMenuShortcut=([bool]$shortcut)
 shortcutTargetMatches=$targetMatches
 uninstallEntry=([bool]$entry)
 uninstallCommand=([bool]$entry.UninstallString)
}
if($Phase -eq 'Installed'){
  $checks['launchObserved']=$false
  $checks['uninstallObserved']=$false
  $checks['exeRemovedAfterUninstall']=$false
  $checks['shortcutRemovedAfterUninstall']=$false
  $checks['uninstallEntryRemovedAfterUninstall']=$false
}else{
  $checks['launchObserved']=$false
  $checks['uninstallObserved']=$false
  $checks['exeRemovedAfterUninstall']=(-not $checks.installedExe)
  $checks['shortcutRemovedAfterUninstall']=(-not $checks.startMenuShortcut)
  $checks['uninstallEntryRemovedAfterUninstall']=(-not $checks.uninstallEntry)
}
$report=[ordered]@{stage='M79';schemaVersion=1;role=$Role;phase=$Phase;liveInputEnabled=$null;checks=$checks;notes='Only automatic observations are filled. Manual observations must be recorded after actual launch and uninstall.'}
if(-not $OutputReport){$OutputReport="m79-$($Role.ToLower())-$($Phase.ToLower()).json"}
$report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $OutputReport -Encoding UTF8
Write-Host "Wrote $OutputReport. Review manual checks before final verification."
