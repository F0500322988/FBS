# FBS Classroom M98 — Local post-install file verification

This stage **does not** install, execute, or modify FBS Classroom. It checks the installed Windows role package's expected file layout. M76 preview installers are still required and are **not included as built EXEs** in this source ZIP.

On the Windows 11 machine after an explicit M97 install, from the project root:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\M98-Post-Install.ps1 -Role Student -Report .\m98-student.json
node .\windows\M98-Verify-Report.js .\m98-student.json .\m98-student-verified.json
```

For Teacher, run as appropriate:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\M98-Post-Install.ps1 -Role Teacher -Report .\m98-teacher.json
node .\windows\M98-Verify-Report.js .\m98-teacher.json
```

Use `-InstallDirectory 'C:\actual\installation\folder'` to override the default location. Use `-ExpectedExeSha256 <64 hex>` to verify the installed executable against a separately trusted hash. Reports omit installation paths, hostnames, credentials, and screen images.

A PASS confirms the file layout and optional EXE hash only. It does **not** prove successful startup, authenticated connectivity, screen-sharing consent, actual uninstallability, or the safety of the EXE. Verify these manually on a pilot device. Remote mouse/keyboard input remains disabled.
