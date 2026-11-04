# FBS Classroom M136 — Encrypted managed-device registry snapshot

Adds `EncryptedDeviceRegistryStore.cs`, an **independent** AES-256-GCM authenticated snapshot serializer for the M135 allowlist and revocations. A managed enrollment service must separately supply and protect a 32-byte secret. Do not hard-code the key, write it beside the snapshot, or treat a caller-provided boolean as administrator authentication.

## Test on Windows 11

```powershell
node --test tests/m136-encrypted-device-registry.test.js
node --test
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M129-Native-Safety.ps1
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
```

The Windows smoke executable now tests persistence across fresh registry objects, revocation after reload, tampered ciphertext, and wrong keys. All tests use isolated temporary files.

## Not yet production-ready

- This storage component is **not wired into the student runtime or an administrator-authenticated enrollment service**. Enrollment remains in-memory until a managed service integrates it.
- AES-GCM detects tampering but **cannot prevent rollback to a previous valid encrypted snapshot**. Use a server-authoritative monotonic enrollment version or signed append-only audit record before relying on persistent revocations.
- Secure key provisioning, ACLs, key rotation, crash recovery, and administrator/teacher authentication remain to be implemented and tested.
- Actual mouse/keyboard injection is still disabled. No Windows installer has been built in this Linux environment.
