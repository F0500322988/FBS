param(
 [ValidateSet('Teacher','Student')][string]$Role='Student',
 [string]$InstallDirectory='',
 [string]$OutputReport='m81-first-run.json'
)
$ErrorActionPreference='Stop'
if ($env:OS -ne 'Windows_NT') { throw 'M81 first-run audit requires Windows.' }
$checks=New-Object System.Collections.Generic.List[object]
function AddCheck([string]$name,[bool]$passed,[string]$remedy) {
 $checks.Add([ordered]@{name=$name;passed=$passed;remedy=$(if($passed){''}else{$remedy})})
}
if (-not $InstallDirectory) { $InstallDirectory=Join-Path $env:LOCALAPPDATA "Programs\FBS Classroom $Role" }
$root=[IO.Path]::GetFullPath($InstallDirectory)
$runtime=Join-Path $root 'Runtime'
$binary=if($Role -eq 'Student'){'FBS.Student.Native.exe'}else{'FBS.Teacher.exe'}
$roleDir=Join-Path $root $Role
AddCheck 'installed_executable' (Test-Path -LiteralPath (Join-Path $roleDir $binary) -PathType Leaf) 'Install the correct role package and check InstallDirectory.'
AddCheck 'bundled_node' (Test-Path -LiteralPath (Join-Path $runtime 'node.exe') -PathType Leaf) 'Rebuild M76 distribution with Runtime.'
$entry=if($Role -eq 'Student'){'student-agent.js'}else{'server.js'}
AddCheck 'runtime_entry' (Test-Path -LiteralPath (Join-Path $runtime $entry) -PathType Leaf) 'Rebuild package; runtime entry is missing.'
if($Role -eq 'Student') {
 $keyFile=Join-Path $env:LOCALAPPDATA 'FBSClassroom\pairing.dpapi'
 $keyValid=$false
 if(Test-Path -LiteralPath $keyFile -PathType Leaf) {
  try {
   $encrypted=Get-Content -LiteralPath $keyFile -Raw
   $secure=ConvertTo-SecureString -String $encrypted.Trim() -ErrorAction Stop
   $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
   try { $keyValid=([Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr).Length -ge 16) }
   finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
  } catch { $keyValid=$false }
 }
 AddCheck 'current_user_dpapi_key' $keyValid 'Run Configure-Student.ps1 under the same Windows account as the student application.'
 AddCheck 'agent_launcher' (Test-Path -LiteralPath (Join-Path $runtime 'Start-Student-Agent.ps1') -PathType Leaf) 'Rebuild package with student launcher.'
} else {
 $pair=$env:FBS_PAIRING_KEY
 $password=$env:FBS_TEACHER_PASSWORD
 AddCheck 'pairing_key_env' ($null -ne $pair -and $pair.Length -ge 16) 'Set FBS_PAIRING_KEY (at least 16 characters) in the teacher launch environment.'
 AddCheck 'teacher_password_env' (-not [string]::IsNullOrWhiteSpace($password)) 'Set FBS_TEACHER_PASSWORD in the teacher launch environment.'
 foreach($name in @('FBS_TLS_CERT','FBS_TLS_KEY')) {
  $value=[Environment]::GetEnvironmentVariable($name)
  AddCheck ($name.ToLowerInvariant()+'_file') (-not [string]::IsNullOrWhiteSpace($value) -and (Test-Path -LiteralPath $value -PathType Leaf)) "Set $name to an existing certificate/key file."
 }
}
$failed=@($checks | Where-Object {-not $_.passed})
$report=[ordered]@{stage='M81';role=$Role;passed=($failed.Count -eq 0);checks=@($checks);failedCount=$failed.Count;note='Readiness only; no network connection or application launch performed. Secrets are never included.'}
$target=[IO.Path]::GetFullPath($OutputReport)
$report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $target -Encoding UTF8
Write-Host "M81 readiness report: $target ($($failed.Count) failed checks)"
if($failed.Count -gt 0){exit 1}
