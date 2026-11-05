param(
  [Parameter(Mandatory=$true)][ValidateSet('Teacher','Student')][string]$Role,
  [string]$TeacherIP = '',
  [int]$TeacherPort = 4180,
  [string]$ExpectedCertSha256 = '',
  [string]$ReportPath = '',
  [switch]$RunBuild
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$checks = New-Object System.Collections.Generic.List[object]
function Record([string]$name,[string]$status,[string]$detail) {
  $checks.Add([pscustomobject]@{ name=$name; status=$status; detail=$detail })
  Write-Host "[$status] $name : $detail"
}
function Fingerprint([byte[]]$raw) {
  $hash = [System.Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($hash.ComputeHash($raw))).Replace('-','') }
  finally { $hash.Dispose() }
}
$localIps = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {
  $_.AddressState -eq 'Preferred' -and $_.IPAddress -notmatch '^(127\.|169\.254\.)'
} | ForEach-Object { $_.IPAddress })
if ($localIps.Count) { Record 'local-ipv4' 'PASS' ($localIps -join ', ') }
else { Record 'local-ipv4' 'FAIL' 'No usable IPv4 address' }
if ($Role -eq 'Teacher') {
  $listener = @(Get-NetTCPConnection -State Listen -LocalPort $TeacherPort -ErrorAction SilentlyContinue)
  if ($listener.Count) { Record 'teacher-listener' 'PASS' "TCP/$TeacherPort listening" }
  else { Record 'teacher-listener' 'FAIL' "Start teacher TLS service on TCP/$TeacherPort" }
  Record 'teacher-certificate' 'MANUAL' 'Record trusted SHA256 certificate fingerprint from teacher TLS configuration and transfer via trusted channel'
  Record 'enrollment' 'MANUAL' 'Verify student device enrollment and approval in teacher UI'
} else {
  $ip = $null
  if (-not [System.Net.IPAddress]::TryParse($TeacherIP,[ref]$ip) -or
      $ip.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) {
    Record 'teacher-ip' 'FAIL' 'Supply a valid IPv4 -TeacherIP'
  } else {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
      $connect = $client.BeginConnect($TeacherIP,$TeacherPort,$null,$null)
      if (-not $connect.AsyncWaitHandle.WaitOne(3000)) { throw 'TCP connection timeout (3 seconds)' }
      $client.EndConnect($connect)
      Record 'tcp-connect' 'PASS' "Connected to $TeacherIP`:$TeacherPort"
      $stream = New-Object System.Net.Security.SslStream($client.GetStream(),$false,({ param($sender,$certificate,$chain,$errors) return $true }))
      try {
        $stream.ReadTimeout = 4000
        $stream.WriteTimeout = 4000
        $stream.AuthenticateAsClient($TeacherIP)
        if (-not $stream.RemoteCertificate) { throw 'Server sent no TLS certificate' }
        $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($stream.RemoteCertificate)
        $actual = Fingerprint $cert.RawData
        Record 'tls-handshake' 'PASS' "TLS=$($stream.SslProtocol); certificate SHA256=$actual (identity NOT yet trusted)"
        $expected = ($ExpectedCertSha256 -replace '[^0-9a-fA-F]','').ToUpperInvariant()
        if (-not $expected) { Record 'tls-identity' 'FAIL' 'Provide -ExpectedCertSha256 from independently verified teacher certificate' }
        elseif ($expected.Length -ne 64) { Record 'tls-identity' 'FAIL' 'Expected SHA256 must contain 64 hex digits' }
        elseif ($expected -ceq $actual) { Record 'tls-identity' 'PASS' 'Teacher certificate fingerprint matched' }
        else { Record 'tls-identity' 'FAIL' 'Teacher certificate fingerprint MISMATCH' }
      } finally { if ($stream) { $stream.Dispose() } }
    } catch { Record 'connection-or-tls' 'FAIL' $_.Exception.Message }
    finally { $client.Close() }
  }
  Record 'enrollment' 'MANUAL' 'Verify signed device enrollment in teacher UI; TCP/TLS alone does not prove enrollment'
  Record 'stop-consent' 'MANUAL' 'Verify student consent, stop button, timeout, and no reactivation on both actual PCs'
}
if ($RunBuild) {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Record 'node-tests' 'FAIL' 'Node.js missing' }
  else {
    Push-Location $root
    try { & node --test *> $null; if ($LASTEXITCODE -eq 0) { Record 'node-tests' 'PASS' 'Automated suite passed' } else { Record 'node-tests' 'FAIL' "Exit $LASTEXITCODE" } }
    finally { Pop-Location }
  }
  if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) { Record 'native-build' 'FAIL' '.NET SDK missing' }
  else {
    Push-Location $root
    try {
      & dotnet build 'windows/FBS.Student.Native/FBS.Student.Native.csproj' --configuration Release *> $null
      if ($LASTEXITCODE -eq 0) { Record 'native-build' 'PASS' 'Student C# build succeeded' }
      else { Record 'native-build' 'FAIL' "Exit $LASTEXITCODE" }
    } finally { Pop-Location }
  }
}
$failed = @($checks | Where-Object { $_.status -eq 'FAIL' }).Count -gt 0
$manual = @($checks | Where-Object { $_.status -eq 'MANUAL' }).Count -gt 0
$report = [ordered]@{
  stage='M44'; role=$Role; checkedAt=(Get-Date).ToString('o'); teacherIP=$TeacherIP
  automatedChecksPassed=(-not $failed); readyForLiveInput=$false
  requiresManualVerification=$manual; checks=@($checks)
}
if (-not $ReportPath) { $ReportPath = "m44-$($Role.ToLowerInvariant())-report.json" }
$out = if ([IO.Path]::IsPathRooted($ReportPath)) { $ReportPath } else { Join-Path $root $ReportPath }
$report | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath $out -Encoding UTF8
Write-Host "Report: $out"
Write-Host 'IMPORTANT: Never treat this diagnostic as authorization to enable real keyboard/mouse injection.'
if ($failed) { exit 1 }
