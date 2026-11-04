# M97 — Local Windows installer runner (pilot only)

This phase adds an explicit, local-only Windows PowerShell installer launcher with a SHA-256 allowlist check. It does **not** deploy to remote PCs, silently install, elevate automatically, uninstall, or roll back. Never run it on untrusted installer files.

## On a Windows 11 pilot PC

1. Produce your M76 Inno Setup EXEs on Windows using `windows/Build-M76-Packages.ps1 -BuildInstallers`, and retrieve their SHA-256 from the verified M80 distribution report. The filename must be `FBS-Classroom-Student-M76-Setup-PREVIEW.exe` or `FBS-Classroom-Teacher-M76-Setup-PREVIEW.exe`.
2. Run **dry-run** verification first (replace paths/hash with real values):

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\M97-Local-Install.ps1 -Role Student -Installer 'C:\Installers\FBS-Classroom-Student-M76-Setup-PREVIEW.exe' -ExpectedSha256 YOUR_REAL_64_CHARACTER_SHA256 -Report .\m97-student.json
```

3. Only on a pilot device after checking the result, repeat with `-Execute`. This launches the visible installer and waits for its exit code. UAC elevation, if needed, remains a Windows/user action.
4. Review execution report:

```powershell
node .\windows\M97-Install-Report.js .\m97-student.json .\m97-verified.json --require-execution
```

5. Manually verify installed app launch, network/TLS, student consent, stop sharing, uninstall and rollback before proceeding to another device.

Reports contain no machine IDs, usernames, passwords, certificate private keys or full installer paths. A successful process exit is **not** proof of app functionality. Remote input remains disabled.
