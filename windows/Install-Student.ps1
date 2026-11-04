# Run as the Windows account that will log in to use the student computer.
param([Parameter(Mandatory=$true)][SecureString]$PairingKey)
$ErrorActionPreference='Stop'
$node=(Get-Command node.exe -ErrorAction Stop).Source
$source=Split-Path -Parent $PSScriptRoot
$target=Join-Path $env:LOCALAPPDATA 'FBSClassroom'
New-Item -ItemType Directory -Force -Path $target | Out-Null
Copy-Item (Join-Path $source 'student-agent.js') $target -Force
Copy-Item (Join-Path $source 'lan.js') $target -Force
$PairingKey | ConvertFrom-SecureString | Set-Content -Path (Join-Path $target 'pairing.dpapi') -Encoding ascii
$launcher=Join-Path $target 'Start-Student.ps1'
@'
$ErrorActionPreference='Stop'
$folder=Split-Path -Parent $MyInvocation.MyCommand.Path
$secret=Get-Content (Join-Path $folder 'pairing.dpapi') -Raw | ConvertTo-SecureString
$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try { $env:FBS_PAIRING_KEY=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
$node=(Get-Command node.exe -ErrorAction Stop).Source
& $node (Join-Path $folder 'student-agent.js')
'@ | Set-Content -Path $launcher -Encoding UTF8
$startup=[Environment]::GetFolderPath('Startup')
$shortcut=Join-Path $startup 'FBS Classroom Student.lnk'
$shell=New-Object -ComObject WScript.Shell
$link=$shell.CreateShortcut($shortcut)
$link.TargetPath=(Get-Command powershell.exe).Source
$link.Arguments='-NoProfile -WindowStyle Hidden -File "'+$launcher+'"'
$link.WorkingDirectory=$target
$link.Description='FBS Classroom Student (LAN classroom management)'
$link.Save()
Write-Host 'Installed for current Windows user. Agent starts on next sign-in.'
Write-Host 'Node.js must remain installed. Windows Firewall must permit UDP discovery port 4181.'
