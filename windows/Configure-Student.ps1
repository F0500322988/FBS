# Run once under the same Windows account that launches FBS Student.
$ErrorActionPreference='Stop'
$secret=Read-Host 'Enter the lab pairing key (exactly 8 digits)' -AsSecureString
$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
    $value=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    $value=-join ($value.ToCharArray() | ForEach-Object {
        $n=[int]$_
        if ($n -ge 0x660 -and $n -le 0x669) { [char](48+$n-0x660) }
        elseif ($n -ge 0x6f0 -and $n -le 0x6f9) { [char](48+$n-0x6f0) }
        else { $_ }
    })
    if ($value -cnotmatch '^[0-9]{8}$') { throw 'Lab key must contain exactly 8 digits' }
    $secret=ConvertTo-SecureString $value -AsPlainText -Force
    $value=$null
}
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
$dir=Join-Path $env:LOCALAPPDATA 'FBSClassroom'
New-Item -ItemType Directory -Path $dir -Force | Out-Null
$secret | ConvertFrom-SecureString | Set-Content -Path (Join-Path $dir 'pairing.dpapi') -Encoding ascii
Write-Host 'Pairing key saved using Windows DPAPI for the current user. Restart FBS Classroom Student.'
