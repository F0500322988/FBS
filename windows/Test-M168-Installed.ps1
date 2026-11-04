param([Parameter(Mandatory=$true)][string]$InstallerDirectory, [ValidatePattern('^M[0-9]{1,4}$')][string]$Milestone = 'M170')
$ErrorActionPreference = 'Stop'
if ($env:CI -ne 'true' -or $env:RUNNER_OS -ne 'Windows') {
  throw 'Run installer mutation tests only on an isolated Windows CI runner, not on a personal workstation.'
}
$installers = (Resolve-Path -LiteralPath $InstallerDirectory).Path
$reportFile = Join-Path $installers "$($Milestone.ToLowerInvariant())-installed-report.json"
$report = [ordered]@{stage=$Milestone; generatedAt=(Get-Date).ToUniversalTime().ToString('o'); passed=$false; guiTested=$false; twoPcLanTested=$false; checks=@(); error=$null}
$temporary = Join-Path $env:TEMP ('FBS-M168-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temporary | Out-Null
foreach ($role in @('Teacher','Student')) {
  if (-not (Test-Path -LiteralPath (Join-Path $installers "FBS-Classroom-$role-$Milestone-Setup-PREVIEW.exe") -PathType Leaf)) {
    throw "Missing $role installer; no installation attempted."
  }
}
try {
  foreach ($role in @('Teacher','Student')) {
    $target = Join-Path $temporary $role
    $installer = Join-Path $installers "FBS-Classroom-$role-$Milestone-Setup-PREVIEW.exe"
    $server = $null
    $installed = $false
    try {
      $setup = Start-Process -FilePath $installer -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-',"/DIR=`"$target`"") -PassThru -Wait
      if ($setup.ExitCode -ne 0) { throw "$role installer exit code $($setup.ExitCode)" }
      $installed = $true
      $report.checks += [ordered]@{name="$role install";passed=$true}
      $exe = if ($role -eq 'Teacher') { 'FBS.Teacher.exe' } else { 'FBS.Student.Native.exe' }
      foreach ($relative in @("$role\$exe", 'Runtime\node.exe','Runtime\server.js','Runtime\authenticated-preview-transport.js','Runtime\public\app.js','Runtime\public\m114-seat-view.js')) {
        if (-not (Test-Path -LiteralPath (Join-Path $target $relative) -PathType Leaf)) { throw "$role missing $relative after install" }
      }
      $report.checks += [ordered]@{name="$role installed runtime files";passed=$true}
      $runtime = Join-Path $target 'Runtime'
      $info = [Diagnostics.ProcessStartInfo]::new((Join-Path $runtime 'node.exe'))
      $info.ArgumentList.Add((Join-Path $runtime 'server.js'))
      $info.UseShellExecute = $false
      $info.CreateNoWindow = $true
      $info.WorkingDirectory = $runtime
      $info.Environment['FBS_DEMO']='1'
      $info.Environment['FBS_TEACHER_PASSWORD']=''
      $info.Environment['PORT']='24178'
      $server = [Diagnostics.Process]::Start($info)
      $deadline = (Get-Date).AddSeconds(20)
      $ready = $false
      while ((Get-Date) -lt $deadline) {
        if ($server.HasExited) { throw "$role packaged server exited before readiness" }
        try {
          $owner = Get-NetTCPConnection -LocalPort 24178 -State Listen -ErrorAction Stop
          if ($owner.OwningProcess -contains $server.Id) {
            $status = Invoke-RestMethod 'http://127.0.0.1:24178/api/status' -TimeoutSec 1
            if ($status.mode -eq 'demo' -and $status.students.Count -eq 21) { $ready=$true; break }
          }
        } catch { }
        Start-Sleep -Milliseconds 200
      }
      if (-not $ready) { throw "$role installed server did not return expected demo roster" }
      $html = (Invoke-WebRequest 'http://127.0.0.1:24178/' -TimeoutSec 3).Content
      if (-not $html.StartsWith('<!doctype html>')) { throw 'Installed dashboard is not HTML' }
      foreach ($match in [regex]::Matches($html, '(?:src|href)="(/[^" ]+)"')) {
        $response = Invoke-WebRequest ('http://127.0.0.1:24178'+$match.Groups[1].Value) -TimeoutSec 3
        if ($response.StatusCode -ne 200) { throw 'Installed dashboard asset failed' }
      }
      $report.checks += [ordered]@{name="$role installed demo HTTP";passed=$true}
    } finally {
      if ($null -ne $server) {
        if (-not $server.HasExited) { $server.Kill($true); $server.WaitForExit() }
        $server.Dispose()
      }
      $uninstaller = Join-Path $target 'unins000.exe'
      if ($installed -and (Test-Path -LiteralPath $uninstaller)) {
        $uninstall = Start-Process -FilePath $uninstaller -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART') -PassThru -Wait
        if ($uninstall.ExitCode -ne 0) { throw "$role uninstaller exit code $($uninstall.ExitCode)" }
        if (Test-Path -LiteralPath (Join-Path $target "$role\$exe")) { throw "$role executable remained after uninstall" }
        $report.checks += [ordered]@{name="$role uninstall";passed=$true}
      } elseif ($installed) { throw "$role uninstaller is missing" }
    }
  }
  $report.passed=$true
} catch { $report.error=$_.Exception.Message; Write-Warning $report.error }
finally {
  $report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $reportFile -Encoding UTF8
  Write-Host "Installer test report: $reportFile"
}
if (-not $report.passed) { exit 1 }
