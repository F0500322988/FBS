# FBS Classroom M138 — Authenticated enrollment boundary

M138 introduces `AuthenticatedEnrollmentService.cs`: a credential-verified facade around M137 persistent enrollment. Administrator verifier uses PBKDF2-HMAC-SHA256 (310,000 iterations), per-verifier random salt, constant-time comparison and a 5-minute lockout after 5 failed attempts. A Windows C# smoke test covers provisioning, revocation, persistence and lockout.

## On Windows 11

```powershell
node --test tests/m138-admin-credential.test.js
node --test
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M129-Native-Safety.ps1
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
```

## Critical limitations

This is a standalone service, NOT connected to the HTTP enrollment routes. The administrator verifier must be securely provisioned and stored by an authorized administrator. Lockout state is in memory, not shared between processes, and must be hardened before production. The older M137 methods accepting a boolean still exist and must not be exposed to untrusted callers. No authenticated device enrollment over the network exists yet. AES-GCM does NOT prevent rollback to an older valid snapshot; this requires a trusted external monotonic revision or server-side revocation authority. Native mouse/keyboard injection remains disabled. No Windows installer or Windows runtime validation was performed in the Linux build environment.
