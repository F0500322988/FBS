param(
  [string]$ReportPath = '.\m37-readiness.json',
  [switch]$SkipNodeTests
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$checks = [System.Collections.Generic.List[object]]::new()
function Record([string]$name, [bool]$passed, [string]$details) {
  $checks.Add([pscustomobject]@{name=$name;passed=$passed;details=$details})
}
function RunChecked([string]$name, [scriptblock]$action) {
  try {
    & $action
    if ($LASTEXITCODE -ne 0) { throw "Exit code: $LASTEXITCODE" }
    Record $name $true 'Passed'
  } catch {
    Record $name $false $_.Exception.Message
  }
}
Push-Location $root
try {
  $adapter = Get-Content '.\windows\FBS.Student.Native\WindowsInputAdapter.cs' -Raw
  $gate = Get-Content '.\windows\FBS.Student.Native\ControlInputGate.cs' -Raw
  # This is a conservative source-level safety tripwire, not proof of runtime security.
  Record 'input-adapter-locked' ($adapter -match 'EnableForVerifiedSession\(bool explicitlyEnabledByOperator\)\s*=>\s*enabled\s*=\s*false\s*;') 'Native injection must remain disabled'
  Record 'input-gate-locked' ($gate -match 'InputEnabled\s*=>\s*false\s*;') 'Control gate must remain preview-only'
  if (-not $SkipNodeTests) {
    if (Get-Command node -ErrorAction SilentlyContinue) {
      RunChecked 'node-tests' { & node --test }
      RunChecked 'agent-syntax' { & node --check student-agent.js }
    } else { Record 'node-tests' $false 'Node.js unavailable' }
  }
  if (Get-Command dotnet -ErrorAction SilentlyContinue) {
    RunChecked 'native-gate-tests' { & dotnet run --project .\windows\FBS.NativeGate.Tests\FBS.NativeGate.Tests.csproj --configuration Release }
    RunChecked 'native-student-build' { & dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj --configuration Release }
  } else {
    Record 'native-gate-tests' $false '.NET SDK unavailable'
    Record 'native-student-build' $false '.NET SDK unavailable'
  }
} finally { Pop-Location }
$allPassed = @($checks | Where-Object { -not $_.passed }).Count -eq 0
$report = [ordered]@{
  version='M37'; generatedAt=(Get-Date).ToUniversalTime().ToString('o');
  machine=$env:COMPUTERNAME; allPassed=$allPassed; inputInjectionEnabled=$false;
  checks=@($checks)
}
$destination = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($ReportPath)
$report | ConvertTo-Json -Depth 6 | Set-Content -Path $destination -Encoding UTF8
Write-Host "M37 report: $destination"
if (-not $allPassed) { Write-Error 'M37 readiness FAILED. Do not enable input injection.'; exit 1 }
Write-Host 'M37 readiness PASSED. Input injection remains DISABLED.' -ForegroundColor Green
