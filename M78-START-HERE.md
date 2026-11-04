# FBS Classroom M78 — Windows installer contract

This stage checks installer scripts, startup safety and optional M76 staged files. It does **not** install or uninstall programs, compile C#, or produce EXE installers in this environment.

Run from the FBS-Classroom project folder:

```powershell
node --test
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M78-Installer.ps1
```

After creating M76 staged packages on Windows 11:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M78-Installer.ps1 -CheckDistribution
```

The report is `m78-installer-report.json`. It rejects missing role/runtime files, missing shortcuts, absent installation metadata, and automatic launch/startup shortcuts. A passing result is a static/package integrity check only. To validate real installation, test both roles in a disposable Windows 11 VM, verify shortcuts and uninstall via Windows Settings, and confirm no unexpected auto-start. Keep real remote input disabled pending separate explicit-consent testing.
