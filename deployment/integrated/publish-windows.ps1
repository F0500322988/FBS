param([Parameter(Mandatory=$true)][string]$ReleaseTag,[Parameter(Mandatory=$true)][string]$BuildRoot,[switch]$CreateVerifiedRelease,[string]$NotesFile="M184-START-HERE.md")
$ErrorActionPreference='Stop'
$PSNativeCommandUseErrorActionPreference=$false
$out=Join-Path $BuildRoot 'installers'
$reportNames=@('Windows-integrated-installer-smoke.json','Core-safety-results.json','SHA256SUMS.txt','Teacher-installed-setup-checks.log','Student-installed-setup-checks.log')
$files=@($reportNames | ForEach-Object { Join-Path $out $_ })
function Invoke-ReleaseCommand([string[]]$GhArguments) {
    $ErrorActionPreference='Continue'
    $lines=@(& gh @GhArguments 2>&1)
    $exitCode=$LASTEXITCODE
    $ErrorActionPreference='Stop'
    foreach ($line in $lines) { Write-Output $line }
    if ($exitCode -ne 0) {
        foreach ($line in ($lines | Select-Object -Last 8)) { Write-Output ('::error::'+$line.ToString().Replace('%','%25').Replace("`r",'%0D').Replace("`n",'%0A')) }
        throw 'GitHub release operation failed; see its exact error above.'
    }
}
if ($CreateVerifiedRelease) {
    $files+=@(@('FBS-Classroom-Teacher-M184-Setup-PREVIEW.exe','FBS-Classroom-Student-M184-Setup-PREVIEW.exe','installer-verification.json','payload-Teacher.json','payload-Student.json') | ForEach-Object { Join-Path $out $_ })
}
foreach ($file in $files) { if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw ('Validation asset missing: '+[IO.Path]::GetFileName($file)) } }
if ($CreateVerifiedRelease) {
    # Publish all tested bytes and reports in one operation, respecting immutable releases.
    $command=@('release','create',$ReleaseTag,'--repo',$env:GITHUB_REPOSITORY,'--target',$env:GITHUB_SHA,'--prerelease','--title',('FBS Classroom '+$(if ($ReleaseTag.StartsWith('m188-')) {'M188'} elseif ($ReleaseTag.StartsWith('m186-')) {'M186'} elseif ($ReleaseTag.StartsWith('m185-')) {'M185'} else {'M184'})+' - verified Windows installers with integrated setup'),'--notes-file',$NotesFile)+$files
    Invoke-ReleaseCommand $command
} else {
    # The normal build workflow keeps its candidate draft until these checks complete.
    Invoke-ReleaseCommand (@('release','upload',$ReleaseTag,'--repo',$env:GITHUB_REPOSITORY,'--clobber')+$files)
    Invoke-ReleaseCommand @('release','edit',$ReleaseTag,'--repo',$env:GITHUB_REPOSITORY,'--draft=false','--title',('FBS Classroom '+$(if ($ReleaseTag.StartsWith('m188-')) {'M188'} elseif ($ReleaseTag.StartsWith('m186-')) {'M186'} elseif ($ReleaseTag.StartsWith('m185-')) {'M185'} else {'M184'})+' - verified Windows installers with integrated setup'),'--notes-file',$NotesFile)
}
