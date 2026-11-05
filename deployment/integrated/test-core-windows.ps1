param([Parameter(Mandatory=$true)][string]$ReportDirectory)
$ErrorActionPreference='Stop'
$PSNativeCommandUseErrorActionPreference=$false
New-Item -ItemType Directory -Path $ReportDirectory -Force | Out-Null
$failedProjects=@();$results=@{}
foreach ($project in @('FBS.NativeGate.Tests','FBS.Setup.Tests','FBS.WindowsSetup.Tests','FBS.FileDelivery.Tests','FBS.ScreenPause.WindowsTests','FBS.Assistance.Tests','FBS.Assistance.WindowsTests','FBS.Power.Tests','FBS.Broadcast.WindowsTests','FBS.Appearance.WindowsTests')) {
    $log=Join-Path $ReportDirectory "$project.log"
    $ErrorActionPreference='Continue'
    & dotnet run --project "windows/$project/$project.csproj" -c Release 2>&1 | Tee-Object -FilePath $log
    $exitCode=$LASTEXITCODE
    $ErrorActionPreference='Stop'
    $results[$project]=($exitCode -eq 0)
    if ($exitCode -ne 0) {
        $failedProjects+=$project
        $details=@(Get-Content -LiteralPath $log | Where-Object { $_ -match 'error|FAIL|Exception|Unhandled' } | Select-Object -Last 6)
        if ($details.Count -eq 0) { $details=@(Get-Content -LiteralPath $log -Tail 6) }
        foreach ($line in $details) { Write-Output ('::error::'+$project+' '+$line.Replace('%','%25').Replace("`r",'%0D').Replace("`n",'%0A')) }
    }
}
$results | ConvertTo-Json | Set-Content (Join-Path $ReportDirectory 'Core-safety-results.json')
if ($failedProjects.Count) { throw ('Failed projects: '+($failedProjects -join ', ')) }
