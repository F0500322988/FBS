# FBS Classroom — M55 Windows Build Verification

This release adds a **fail-closed Windows build and native-test verification script**. It does not enable OS input injection or claim Windows hardware testing.

## Run on Windows 11

Install Node.js and .NET 8 SDK, extract this archive, open PowerShell in `FBS-Classroom`, and run:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M55-Windows-Build.ps1 -ReportPath .\m55-windows-build.json
```

The script checks Node syntax and tests, runs the C# safety tests, and builds both student and teacher launchers. On any failure it exits nonzero and writes `passed: false` with a failure reason. `osInputEnabled` remains false.

**Next:** Share the generated JSON report and any C# compiler errors to fix native build issues. Only then test two actual Windows machines, explicit student consent, stop behavior, and disconnection before enabling OS input.
