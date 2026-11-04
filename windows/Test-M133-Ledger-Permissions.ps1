# M133: Read-only ACL audit for the current user's persisted student stop ledger.
# Run under the SAME Windows account as the student application. No ACLs are changed.
param([string]$ReportPath = '')
$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSEdition -eq 'Core' -and -not $IsWindows) { throw 'Windows is required.' }
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) { throw 'Windows is required.' }
$ledger = Join-Path $env:LOCALAPPDATA 'FBS\Classroom\student-stopped-sessions.json'
$folder = Split-Path $ledger -Parent
$findings = [System.Collections.Generic.List[string]]::new()
$checks = [System.Collections.Generic.List[object]]::new()
$targets = @($folder, $ledger)
$dangerousSids = @('S-1-1-0', 'S-1-5-7') # Everyone, Anonymous Logon
$broadSids = @('S-1-5-11', 'S-1-5-32-545') # Authenticated Users, BUILTIN\Users
$writeMask = [int]([System.Security.AccessControl.FileSystemRights]::WriteData -bor
    [System.Security.AccessControl.FileSystemRights]::AppendData -bor
    [System.Security.AccessControl.FileSystemRights]::WriteAttributes -bor
    [System.Security.AccessControl.FileSystemRights]::WriteExtendedAttributes -bor
    [System.Security.AccessControl.FileSystemRights]::ChangePermissions -bor
    [System.Security.AccessControl.FileSystemRights]::TakeOwnership -bor
    [System.Security.AccessControl.FileSystemRights]::Delete)
$failed = $false
foreach ($target in $targets) {
    if (-not (Test-Path -LiteralPath $target)) {
        $checks.Add([pscustomobject]@{path=$target; status='NOT_CREATED'; note='Start and stop a test session first; no permissions verified.'})
        continue
    }
    try {
        $acl = Get-Acl -LiteralPath $target
        $status = 'PASS'; $notes = [System.Collections.Generic.List[string]]::new()
        foreach ($rule in $acl.Access) {
            if ($rule.AccessControlType -ne [System.Security.AccessControl.AccessControlType]::Allow) { continue }
            $sid = try { $rule.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value } catch { '' }
            if (([int]$rule.FileSystemRights -band $writeMask) -eq 0) { continue }
            if ($dangerousSids -contains $sid) {
                $status = 'FAIL'; $failed = $true
                $notes.Add("Broad unsafe write permission for $($rule.IdentityReference)")
            } elseif ($broadSids -contains $sid) {
                if ($status -ne 'FAIL') { $status = 'WARN' }
                $notes.Add("Broad group write permission for $($rule.IdentityReference); review deployment policy")
            }
        }
        $checks.Add([pscustomobject]@{path=$target; status=$status; owner=$acl.Owner; notes=@($notes)})
    } catch {
        $failed = $true
        $checks.Add([pscustomobject]@{path=$target; status='FAIL'; note="Could not inspect ACL: $($_.Exception.Message)"})
    }
}
$report = [pscustomobject]@{
    schema='fbs-m133-ledger-acl-v1'; createdUtc=[DateTime]::UtcNow.ToString('o')
    computer=$env:COMPUTERNAME; account=[Environment]::UserName
    ledger=$ledger; checks=@($checks)
    conclusion=$(if ($failed) {'FAIL'} elseif (@($checks | Where-Object { $_.status -ne 'PASS' }).Count -gt 0) {'INCOMPLETE_OR_REVIEW'} else {'PASS'})
    limitation='ACL inspection only. This does not prove ledger integrity, server revocation, device enrollment, or authorization. Run as student account.'
}
$json = $report | ConvertTo-Json -Depth 6
if ($ReportPath) {
    $dest = [IO.Path]::GetFullPath($ReportPath)
    $parent = Split-Path $dest -Parent
    if ($parent) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    [IO.File]::WriteAllText($dest, $json)
}
Write-Output $json
if ($failed) { exit 1 }
