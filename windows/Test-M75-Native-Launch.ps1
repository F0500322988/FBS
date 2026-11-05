param(
 [ValidateSet('Teacher','Student')][string]$Role,
 [string]$Distribution = '.\dist-m60'
)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $root
try {
 if($env:OS -ne 'Windows_NT'){ throw 'This step requires Windows 11.' }
 if(-not (Get-Command node.exe -ErrorAction SilentlyContinue)){throw 'Node.js is required.'}
 & node (Join-Path $PSScriptRoot 'M74-Native-Preflight.js') $Distribution
 if($LASTEXITCODE -ne 0){throw 'M74 distribution preflight failed.'}
 $exe = if($Role -eq 'Teacher'){'Teacher\FBS.Teacher.exe'}else{'Student\FBS.Student.Native.exe'}
 $target=Join-Path (Resolve-Path $Distribution).Path $exe
 Write-Host "Verified package. Launch manually on the authorized $Role PC: $target"
 Write-Host 'Teacher: configure FBS_PAIRING_KEY, FBS_TEACHER_PASSWORD, FBS_TLS_CERT, FBS_TLS_KEY before launch.'
 Write-Host 'Student: confirm the visible local consent and stop controls. Never grant control without consent.'
 Write-Host 'This command DOES NOT launch EXEs, attest outcomes, or enable keyboard/mouse input.'
} finally {Pop-Location}
