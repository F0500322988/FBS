# FBS Classroom M37 — Windows readiness gate

This stage adds a **fail-closed Windows readiness report**. It does not enable remote mouse or keyboard control.

On a Windows 11 development PC with Node.js and .NET 8 SDK, open PowerShell in the `FBS-Classroom` directory:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M37-Readiness.ps1 -ReportPath .\m37-readiness.json
```

The report records: Node tests, student agent syntax, native C# gate tests, native student build, and source-level checks that both the gate and adapter remain disabled. Any failed check yields a nonzero exit status. The source-level checks are **not** a substitute for end-to-end security or runtime verification.

Run the existing M34 LAN diagnostics on separate teacher and student machines, and the M35 HTTPS integration tests, before any further work on live input. Do not enable Windows SendInput until the Windows tests pass and consent, revocation, identity, and fail-closed behavior have been verified on real machines.

No Windows binary was built in the authoring environment; the .NET SDK is not installed there.
