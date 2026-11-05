param([ValidateSet('Teacher','Student')][string]$Role='Student',[switch]$ManualChecklist)
$ErrorActionPreference='Stop'
$report=[ordered]@{stage='M182'; platform='Windows'; role=$Role; os=[Environment]::OSVersion.Version.ToString(); architecture=[Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString(); userRunReport=$true; physicalHardwareVerified=$false; automatic=@{}; userReported=@{}; secretsCollected=$false}
$registry=if($Role -eq 'Teacher'){'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\FBSClassroom.Teacher.Preview'}else{'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\FBSClassroom.Student.Preview'}
try {
 $installed=Get-ItemProperty $registry
 $report.automatic.correctVersion=($installed.DisplayVersion -eq '0.182.0-preview')
 if(-not $report.automatic.correctVersion){throw 'M182 is not installed.'}
 $target=[IO.Path]::GetFullPath($installed.InstallLocation)
 $manifest=Get-Content (Join-Path $PSScriptRoot "payload-$Role.json") -Raw | ConvertFrom-Json
 if($manifest.role -ne $Role -or $manifest.version -ne '0.182.0-preview'){throw 'Wrong verification manifest.'}
 $prefix=$target.TrimEnd('\')+'\'
 $bad=0
 foreach($entry in $manifest.files){
  $path=[IO.Path]::GetFullPath((Join-Path $target $entry.path))
  if(-not $path.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe manifest path.'}
  if(-not (Test-Path -LiteralPath $path -PathType Leaf)){$bad++;continue}
  $item=Get-Item -LiteralPath $path
  if(($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -or $item.Length -ne $entry.size -or (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256){$bad++}
 }
 $report.automatic.payloadFiles=$manifest.files.Count;$report.automatic.payloadHashPassed=($bad -eq 0)
 if($bad -ne 0){throw 'Installed payload failed integrity verification; runtime will not be executed.'}
 $node=Join-Path $target 'Runtime/node.exe';$v=& $node --version;$report.automatic.bundledNodeRan=($LASTEXITCODE -eq 0 -and $v -eq 'v22.23.4')
 try{$port=if($Role -eq 'Teacher'){4177}else{4190};$tcp=[Net.Sockets.TcpClient]::new();$pending=$tcp.ConnectAsync('127.0.0.1',$port);$report.automatic.localPortListening=$pending.Wait(1500);$tcp.Dispose()}catch{$report.automatic.localPortListening=$false}
}catch{$report.automatic.setupOrPayloadPassed=$false;Write-Host 'Install M182 and keep the provided verification manifests beside this script.'}
$checks=@('teacherStudentOnSameLAN','teacherFingerprintComparedLocally','studentApproved','broadcastStartsWithoutStudentPrompt','broadcastFillsScreen','teacherStopsBroadcast','broadcastExitsOnNetworkLoss','powerInventorySaved','sleepRequest','wakeFromSleep','restartRequest','shutdownRequest','powerOnFromFullShutdown')
foreach($name in $checks){$report.userReported[$name]='not-run';if($ManualChecklist){$answer=Read-Host "$name : PASS / FAIL / SKIP";if($answer -eq 'PASS'){$report.userReported[$name]='user-reported-pass'}elseif($answer -eq 'FAIL'){$report.userReported[$name]='user-reported-fail'}}}
$path=Join-Path (Get-Location) ('FBS-M182-Windows-'+$Role+'-'+[Guid]::NewGuid().ToString('N')+'.json')
$report|ConvertTo-Json -Depth 6|Set-Content -LiteralPath $path -Encoding UTF8
Write-Host "Saved report: $path"
Write-Host 'No lab keys, passwords, identity files, TLS private keys or screenshots collected. Unrun/manual checks are not automatic passes.'
