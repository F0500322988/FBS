# FBS Classroom M141 — Managed enrollment command boundary

This release adds `ManagedEnrollmentCommandService.cs`, a typed, fail-closed C# integration boundary that requires an administrator password for managed-device registration and revocation. It validates device identifiers and RSA public keys before invoking the existing authenticated enrollment service, and includes native C# runtime smoke tests.

**Not yet a network endpoint or UI.** This does not authenticate a teacher session, activate real mouse/keyboard input, or fix encrypted-registry rollback. Do not expose the component directly to untrusted HTTP without TLS, CSRF/session protections, server-side authorization, and audit logging. Administrator credential and encryption keys must be provisioned securely; first-time provisioning must be separate from normal restarts.

On Windows 11, with Node.js and .NET 8 SDK:

```powershell
node --test tests/m141-managed-enrollment-command.test.js
node --test
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M129-Native-Safety.ps1
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
```

Native tests cannot run in Linux without the Windows .NET runtime. Native input remains intentionally disabled.
