param(
  [ValidateSet('Teacher','Student')][string]$Role = 'Student',
  [string]$TeacherIP = '',
  [int]$TeacherPort = 4180,
  [int]$DiscoveryPort = 4181,
  [string]$ReportPath = ''
)
$ErrorActionPreference = 'Stop'
$results = New-Object System.Collections.Generic.List[object]
function Add-Check($Name, $Status, $Detail) {
  $results.Add([pscustomobject]@{ Check=$Name; Status=$Status; Detail=$Detail })
  Write-Host "[$Status] $Name - $Detail"
}
$interfaces = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' -and $_.AddressState -eq 'Preferred' }
if ($interfaces) { Add-Check 'Local IPv4' 'PASS' (($interfaces.IPAddress) -join ', ') }
else { Add-Check 'Local IPv4' 'FAIL' 'No usable IPv4 interface' }
if ($Role -eq 'Teacher') {
  foreach ($port in @($TeacherPort,$DiscoveryPort)) {
    $protocol = if ($port -eq $TeacherPort) { 'TCP' } else { 'UDP' }
    $rules = Get-NetFirewallRule -Enabled True -Direction Inbound -Action Allow -ErrorAction SilentlyContinue |
      Get-NetFirewallPortFilter -ErrorAction SilentlyContinue |
      Where-Object { $_.Protocol -eq $protocol -and ($_.LocalPort -eq [string]$port -or $_.LocalPort -eq 'Any') }
    if ($rules) { Add-Check "Firewall $protocol/$port" 'INFO' 'An inbound allow rule exists; verify profile and scope manually' }
    else { Add-Check "Firewall $protocol/$port" 'WARN' 'No explicit allow rule detected; inspect firewall policy' }
  }
  $listener = Get-NetTCPConnection -LocalPort $TeacherPort -State Listen -ErrorAction SilentlyContinue
  if ($listener) { Add-Check 'Teacher TLS listener' 'PASS' "Listening on TCP/$TeacherPort" }
  else { Add-Check 'Teacher TLS listener' 'WARN' 'Not listening; start teacher app with configured TLS cert and key' }
} else {
  if ([string]::IsNullOrWhiteSpace($TeacherIP)) {
    Add-Check 'Teacher address' 'WARN' 'Specify -TeacherIP to test TCP reachability; UDP discovery is not verified by this check'
  } else {
    try {
      $ip = [System.Net.IPAddress]::Parse($TeacherIP)
      if ($ip.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) { throw 'IPv4 required' }
      $tcp = Test-NetConnection -ComputerName $TeacherIP -Port $TeacherPort -InformationLevel Quiet -WarningAction SilentlyContinue
      if ($tcp) { Add-Check "Teacher TCP/$TeacherPort" 'PASS' 'TCP reachable; TLS identity and enrollment not verified' }
      else { Add-Check "Teacher TCP/$TeacherPort" 'FAIL' 'TCP unreachable; check teacher app, VLAN, and firewall' }
    } catch { Add-Check 'Teacher address' 'FAIL' $_.Exception.Message }
  }
  $udp = Get-NetUDPEndpoint -LocalPort $DiscoveryPort -ErrorAction SilentlyContinue
  if ($udp) { Add-Check "Student UDP/$DiscoveryPort" 'INFO' 'Local UDP endpoint found; discovery packet reception is not verified' }
  else { Add-Check "Student UDP/$DiscoveryPort" 'WARN' 'No local listener detected; start student agent' }
}
if ($ReportPath) {
  $results | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $ReportPath -Encoding UTF8
  Write-Host "Report saved to $ReportPath"
}
if ($results.Status -contains 'FAIL') { exit 1 }
Write-Host 'Diagnostic finished. This does NOT confirm signed enrollment, screen streaming, or remote input.'
