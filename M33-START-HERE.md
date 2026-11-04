# FBS Classroom M33 — Windows build and smoke-test kit

This release adds an executable Windows PowerShell smoke-test script, plus a Node.js HTTP integration test. It does **not** enable remote mouse/keyboard input.

## Run on one Windows 11 development machine

1. Install Node.js (v20 or later) and .NET 8 SDK.
2. Extract the ZIP and open PowerShell in the `FBS-Classroom` directory.
3. Run:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M33-Windows.ps1
```

The script checks JS syntax, runs all Node.js tests, compiles the native Student and Teacher C# projects in Release mode, and runs a local authenticated HTTP smoke test with **21 simulated devices**. It does not install software, connect to real student PCs, test LAN TLS/discovery, or enable input injection.

If the build fails, send the complete error output. If it passes, the next step is an actual two-PC test with LAN certificates and the signed enrollment process, followed by stop/revocation verification.

## Security
The HTTP demo runs only on loopback and uses a fixed **demo-only** password. Never reuse that password for live mode. Actual remote input is disabled.
