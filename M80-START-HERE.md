# FBS Classroom M80 — Windows distribution gate

This stage validates M76 Teacher and Student staging folders and portable ZIP files, optionally requiring both Inno Setup installers. It is a file-integrity preflight, **not** an installer signature check, real Windows install test, malware scan, or confirmation of native app functionality. Live mouse/keyboard input remains disabled.

On Windows 11, from the FBS-Classroom directory:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M60-Runtime.ps1
powershell -ExecutionPolicy RemoteSigned -File .\windows\Build-M76-Packages.ps1
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M80-Distribution.ps1
```

To require installer EXEs, build M76 packages in a fresh output directory with `-BuildInstallers`, then run:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M80-Distribution.ps1 -Distribution .\dist-m76-installers -RequireInstallers
```

Note: the above installer output must be created by `Build-M76-Packages.ps1 -OutputDirectory .\dist-m76-installers -BuildInstallers` and requires Inno Setup 6 (ISCC.exe). Report `m80-distribution.json` records file hashes, sizes and missing items, not credentials. Do not distribute preview installers to all lab devices until tested on two Windows machines and signed/approved by your administrator.
