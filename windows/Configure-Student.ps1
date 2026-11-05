# Run once under the same Windows account that launches FBS Student.
$ErrorActionPreference='Stop'
$secret=Read-Host 'Enter the lab pairing key (minimum 16 characters)' -AsSecureString
$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try { if ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr).Length -lt 16) { throw 'Pairing key too short' } }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
$dir=Join-Path $env:LOCALAPPDATA 'FBSClassroom'
New-Item -ItemType Directory -Path $dir -Force | Out-Null
$secret | ConvertFrom-SecureString | Set-Content -Path (Join-Path $dir 'pairing.dpapi') -Encoding ascii
Write-Host 'Pairing key saved using Windows DPAPI for the current user. Restart FBS Classroom Student.'
