$ErrorActionPreference='Stop'
Remove-Item (Join-Path ([Environment]::GetFolderPath('Startup')) 'FBS Classroom Student.lnk') -Force -ErrorAction SilentlyContinue
Write-Host 'Startup removed. Sign out to stop an agent launched at login.'
Write-Host 'To delete local config after stopping the agent, remove %LOCALAPPDATA%\FBSClassroom manually.'
