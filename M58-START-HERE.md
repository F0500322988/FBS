# FBS Classroom M58 — Windows build diagnostics

This release adds an **offline, non-invasive build-failure classifier**. It does not enable remote input, compile an EXE in this environment, or claim a physical Windows test.

## On Windows 11

Install Node.js and .NET 8 SDK, open PowerShell in the `FBS-Classroom` folder and run:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M58-Diagnostics.ps1
```

Outputs: `m58-analysis.json`, `m58-m57-diagnostics.json`, `m58-m57-diagnostics.log` and (when generated) M56 build reports. A nonzero exit means build readiness failed; the diagnostic files are still useful.

You may analyze an existing M57 report without Windows:

```bash
node windows/Analyze-M58-Build.js m57-diagnostics.json m58-analysis.json m57-diagnostics.log
```

The M58 summary deliberately omits raw logs and machine identifiers. Review raw logs locally and redact paths, secrets, and machine identifiers before sharing. M58 analysis does not substitute for running C# tests and checking consent/stop on real Windows 11 devices.
