# M159: read-only LAN readiness diagnostics. Does not change firewall, trust, or enrollment.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][ValidateSet('Teacher','Student')][string]$Role,
  [Parameter(Mandatory=$true)][string]$TeacherHost,
  [ValidateRange(1024,65535)][int]$Port = 47443,
  [string]$ExpectedCertificateSha256,
  [switch]$RequireTls
)
$ErrorActionPreference = 'Stop'
function Result([string]$Name,[bool]$Ok,[string]$Detail) {
  [pscustomobject]@{Check=$Name;Pass=$Ok;Detail=$Detail}
}
$results = [System.Collections.Generic.List[object]]::new()
$ips = @()
try {
  $ips = [System.Net.Dns]::GetHostAddresses($TeacherHost) | Where-Object {
    $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -or
    $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetworkV6
  }
  $results.Add((Result 'DNS' ($ips.Count -gt 0) (($ips | ForEach-Object ToString) -join ', ')))
} catch { $results.Add((Result 'DNS' $false $_.Exception.GetType().Name)) }
if ($Role -eq 'Teacher') {
  $local = @([System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) | ForEach-Object ToString) + @('127.0.0.1','::1')
  $results.Add((Result 'LocalBinding' ($local -contains $TeacherHost -or $ips.Count -gt 0 -and (@($ips | ForEach-Object ToString | Where-Object { $local -contains $_ }).Count -gt 0)) 'TeacherHost must resolve to an address owned by this teacher computer'))
  try {
    $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop)
    $results.Add((Result 'Listener' ($listeners.Count -gt 0) ('Listening sockets: ' + $listeners.Count)))
  } catch { $results.Add((Result 'Listener' $false 'No listener or Get-NetTCPConnection unavailable')) }
  try {
    $rules = @(Get-NetFirewallRule -Enabled True -Direction Inbound -Action Allow -ErrorAction Stop | Where-Object { $_.DisplayName -like '*FBS*' })
    $results.Add((Result 'FirewallInfo' $true ('FBS-named inbound allow rules: ' + $rules.Count + '; informational only'))
  } catch { $results.Add((Result 'FirewallInfo' $true 'Firewall rule inventory unavailable; check Windows Defender Firewall manually')) }
} else {
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $task = $client.ConnectAsync($TeacherHost,$Port)
    if (-not $task.Wait([TimeSpan]::FromSeconds(5))) { throw 'TCP connection timeout (5s)' }
    $task.GetAwaiter().GetResult()
    $results.Add((Result 'TCP' $true 'Teacher port reachable'))
    if ($RequireTls) {
      $pin = ($ExpectedCertificateSha256 -replace '[\s:]','').ToUpperInvariant()
      if ($pin -notmatch '^[0-9A-F]{64}$') { throw 'RequireTls requires a trusted 64-hex-character SHA-256 certificate fingerprint' }
      $script:pinMatched = $false
      $callback = [System.Net.Security.RemoteCertificateValidationCallback] {
        param($sender,$certificate,$chain,$errors)
        if ($null -eq $certificate) { return $false }
        $bytes = $certificate.GetRawCertData()
        $digest = [System.Security.Cryptography.SHA256]::HashData($bytes)
        $actual = [Convert]::ToHexString($digest)
        $script:pinMatched = [string]::Equals($actual,$pin,[StringComparison]::OrdinalIgnoreCase)
        return $script:pinMatched
      }.GetNewClosure()
      $stream = [System.Net.Security.SslStream]::new($client.GetStream(),$false,$callback)
      try {
        $options = [System.Net.Security.SslClientAuthenticationOptions]::new()
        $options.TargetHost = $TeacherHost
        $options.EnabledSslProtocols = [System.Security.Authentication.SslProtocols]::Tls12 -bor [System.Security.Authentication.SslProtocols]::Tls13
        if (-not $stream.AuthenticateAsClientAsync($options,[Threading.CancellationToken]::None).Wait([TimeSpan]::FromSeconds(8))) { throw 'TLS handshake timeout (8s)' }
        if (-not $stream.IsAuthenticated -or -not $script:pinMatched) { throw 'TLS authentication or certificate pin validation failed' }
        $results.Add((Result 'TLSPin' $true 'Pinned TLS handshake succeeded; no identity or control commands sent'))
      } finally { $stream.Dispose() }
    }
  } catch {
    $name = if ($RequireTls -and @($results | Where-Object Check -eq 'TCP').Count -gt 0) { 'TLSPin' } else { 'TCP' }
    $results.Add((Result $name $false $_.Exception.Message))
  } finally { $client.Dispose() }
}
$results | Format-Table -AutoSize | Out-Host
if (@($results | Where-Object { -not $_.Pass }).Count -gt 0) { exit 1 }
exit 0
