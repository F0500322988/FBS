# FBS Classroom M40 — Native input dry-run

M40 adds a C# decision pipeline between validated preview payloads and the session gate. It returns **accepted-preview-only** or a rejection reason. It never dispatches to Windows input APIs. The WindowsInputAdapter remains hard-disabled.

On Windows 11 with Node.js and .NET 8 SDK, from the project root run:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M40-DryRun.ps1 -ReportPath .\m40-dry-run.json
```

This runs Node tests, the native C# test harness and a native student build. The .NET tests/build have NOT been run in the Linux development environment. Do not enable OS injection until real Windows tests, student consent and stop behavior have been verified.
