# FBS Classroom M57 — Windows diagnostics

Run on Windows 11 with PowerShell from the FBS-Classroom directory:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M57-Diagnostics.ps1
```

The script writes `m57-diagnostics.json` and `m57-diagnostics.log` even if Node.js or .NET 8 SDK is missing. When prerequisites pass, it runs the M56 test/build suite, whose detailed output is in `m57-m56-build.log` and report in `m57-m56-build.json`. Share these reports to diagnose C# build failures.

No real input injection is enabled by this stage. A successful static guard check is not a security audit. Windows compilation and two-device field testing are still required.
