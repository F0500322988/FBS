$ErrorActionPreference = 'Stop'
$runtime = Split-Path -Parent $MyInvocation.MyCommand.Path
$keyFile = Join-Path $env:LOCALAPPDATA 'FBSClassroom\pairing.dpapi'
if (!(Test-Path $keyFile)) { exit 2 }
$secure = (Get-Content -Path $keyFile -Raw).Trim() | ConvertTo-SecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $env:FBS_PAIRING_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
try { & (Join-Path $runtime 'node.exe') (Join-Path $runtime 'student-agent.js') }
finally { Remove-Item Env:\FBS_PAIRING_KEY -ErrorAction SilentlyContinue }
