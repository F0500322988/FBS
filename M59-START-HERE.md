# FBS Classroom M59 — Windows release artifact verification

This stage adds a Windows-only release build script that runs JavaScript and C# tests, publishes teacher and student executables, verifies both files exist, and writes SHA-256 hashes and sizes to a JSON report. It does **not** prove the EXEs work on real PCs, install the app, or enable remote input. Student native UI still requires its separate Node agent; teacher launcher requires Node and TLS configuration.

On Windows 11 with Node.js and .NET 8 SDK, from FBS-Classroom root:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M59-Release.ps1
node .\windows\Verify-M59-Release.js .\m59-release.json
```

The verifier checks report metadata only; verify binaries on disk using Get-FileHash and test the actual applications on two PCs before deployment. If publishing fails, share the M59 report and console errors. No Windows build was run in the development container.
