# FBS Classroom M131 — Restart-safe stop ledger

M131 persists stopped session identifiers to `%LOCALAPPDATA%\FBS\Classroom\student-stopped-sessions.json` before accepting another poll. A corrupt, inaccessible or full ledger causes fail-closed behavior: no new sessions are polled until the issue is resolved by an administrator. The file is not a cryptographic authority and must not replace server-side revocation.

## Windows 11 checks

From the FBS-Classroom root:

```powershell
node --test tests/m131-persistent-stop-ledger.test.js
node --test
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M129-Native-Safety.ps1
```

Manual verification: stop a preview session, close and restart the student app, then confirm the same session ID cannot be accepted again. Verify a new authorized session can still be previewed. Test corrupt ledger on a disposable test account only; preserve the original ledger before testing. Native mouse and keyboard injection remains disabled.

## Limits

The ledger uses local storage and is subject to local administrator modification. This release has no Windows EXE built or validated in the Linux build environment. The JavaScript tests primarily inspect source wiring; validate behavior on Windows 11.
