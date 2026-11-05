param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference = 'Stop'
if (-not [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)) { throw 'Windows required' }
$full = [System.IO.Path]::GetFullPath($Path)
if (Test-Path -LiteralPath $full) { throw 'Refusing to overwrite an existing path. Choose a new directory.' }
$parent = Split-Path -Parent $full
if (-not (Test-Path -LiteralPath $parent -PathType Container)) { throw 'Parent directory does not exist.' }
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$acl = New-Object System.Security.AccessControl.DirectorySecurity
$acl.SetAccessRuleProtection($true, $false)
$acl.SetOwner($identity.User)
$inherit = [System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
$prop = [System.Security.AccessControl.PropagationFlags]::None
$allow = [System.Security.AccessControl.AccessControlType]::Allow
foreach ($sid in @($identity.User, (New-Object System.Security.Principal.SecurityIdentifier('S-1-5-18')), (New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-544')))) {
  $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($sid, [System.Security.AccessControl.FileSystemRights]::FullControl, $inherit, $prop, $allow)
  $acl.AddAccessRule($rule)
}
# Set ACL on a new directory without first inheriting broad permissions.
[System.IO.Directory]::CreateDirectory($full, $acl) | Out-Null
Write-Host "Created private directory: $full"
Write-Host 'Run FBS.Admin.Provision using the same Windows account.'
