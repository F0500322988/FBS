# M139 — Durable administrator login lockout

This stage adds an optional encrypted persistent authentication-attempt state to `AuthenticatedEnrollmentService`. A lockout survives process restart. Corrupt or unreadable state locks enrollment down.

## Windows verification

```powershell
node --test tests/m139-durable-admin-lockout.test.js
node --test
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M129-Native-Safety.ps1
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
```

## Deployment limits

The new constructor takes an administrator-controlled state path and a securely provisioned 32-byte key. The existing three-argument constructor remains for backward compatibility and DOES NOT persist lockouts. The new constructor is exercised by the C# smoke test but is NOT yet wired to a production enrollment HTTP endpoint. The state file needs restricted Windows ACLs. Encryption does not prevent replacing a valid file with an older copy, deleting it, or concurrent-process races; production rollout requires an OS-protected monotonic version/transactional server-side store and authenticated enrollment API. Mouse/keyboard injection stays disabled. No Windows EXE was built here.
