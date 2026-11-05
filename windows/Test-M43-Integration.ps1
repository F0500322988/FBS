param([string]$TeacherIP = '', [string]$ReportPath = '.\m43-report.json')
$ErrorActionPreference = 'Stop'
$results = New-Object System.Collections.Generic.List[object]
function Check($Name, $Action) {
  try { & $Action; if ($LASTEXITCODE -ne 0) { throw "Exit code $LASTEXITCODE" }; $results.Add([pscustomobject]@{Check=$Name;Status='PASS'}) }
  catch { $results.Add([pscustomobject]@{Check=$Name;Status='FAIL';Detail=$_.Exception.Message}) }
}
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  Check 'Node test suite including signed HTTPS two-student integration' { node --test }
  Check 'Student agent syntax' { node --check student-agent.js }
  if ($TeacherIP) {
    Check 'Teacher TCP/4180 reachable' {
      if (-not (Test-NetConnection -ComputerName $TeacherIP -Port 4180 -InformationLevel Quiet -WarningAction SilentlyContinue)) { throw 'Teacher TCP port unreachable' }
    }
  }
  $results | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $ReportPath -Encoding UTF8
  $results | Format-Table -AutoSize
  if ($results.Status -contains 'FAIL') { exit 1 }
} finally { Pop-Location }
Write-Host 'PASS means local test readiness only; it does not prove enrollment, TLS identity or screen sharing across two PCs.'
