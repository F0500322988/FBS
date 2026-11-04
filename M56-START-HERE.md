# FBS Classroom M56 — Windows Build Evidence

## Purpose
Run the existing Windows native build/safety checks and save both the detailed console log and a machine-readable report. A new validator rejects incomplete, stale, failed, or unsafe reports. **This is a report consistency check, not proof of authenticity**; it does not replace observing the real Windows test.

## Windows 11 prerequisites
Node.js, .NET 8 SDK, PowerShell. Extract the ZIP locally, then from the `FBS-Classroom` directory:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M56-Windows.ps1
```

Send `m56-windows-build.json` and `m56-windows-build.log` for troubleshooting. Do not share passwords or private keys. The log may contain machine paths and names.

## Scope
No OS mouse/keyboard injection is enabled. No EXE is built in this environment. The C# test and builds must be run on Windows. M56 verifies report completeness only and does not perform a two-PC LAN test.
