# FBS Classroom M49 — Single-device native pre-dispatch guard

## What changed
- New `SingleStudentExecutionGuard.cs` in the Windows student project.
- The guard requires a single target, local operator arm, student consent, live agent contact (<=6 seconds), valid session, and verified command.
- Revocation, student stop, expiry, and disconnection fail closed.
- Native `SendInput` is **still disabled**; even a positive dry-run decision cannot inject input.
- The Windows UI now explicitly stops the guard whenever its native input adapter and preview gate are deactivated.
- Native C# test project includes the guard and tests rejection cases.

## Windows verification
Run from the project root in PowerShell with .NET 8 SDK and Node.js installed:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M49-Guard.ps1
```

This does not enable remote control. Do not use readiness JSON files as authorization for OS input. Field testing on two real Windows 11 computers is still required.
