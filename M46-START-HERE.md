# FBS Classroom M46 — Windows readiness evidence

This release **does not enable mouse or keyboard injection**. It adds a strict evidence-review gate and a PowerShell script for automated Windows builds/tests.

On Windows 11 with Node.js and .NET 8 SDK:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M46-Readiness.ps1 -ReportPath .\m46-readiness.json
node .\readiness-evidence.js .\m46-readiness.json
```

The review is expected to **fail closed** until a real two-PC test has separately verified TLS certificate pinning, student consent, immediate stop, and stop on disconnection. The PowerShell script deliberately does not assert those results or set `realWindowsTwoPc`. Manual claims must be backed by actual observed test logs. Even a `ready` evidence review does not activate OS input; the native adapter remains disabled.

No Windows binary was compiled in the development environment.
