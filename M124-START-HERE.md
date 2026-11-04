# FBS Classroom M124 — Session Liveness Guard

## What changed
- Added `windows/FBS.Student.Native/SessionLivenessGuard.cs` to enforce session identity, expiry, six-second agent silence limit, and local fail-closed revocation.
- Integrated liveness checks in the native student's **preview-only** command path.
- Clearing or switching sessions revokes the liveness guard.
- Added 15 regression checks in `tests/m124-session-liveness.test.js`.

## Windows 11 validation
Run from the project root:

```powershell
node --test tests/m124-session-liveness.test.js
node --test
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
powershell -ExecutionPolicy RemoteSigned -File .\windows\Build-Installers.ps1
```

Test with one teacher and one student device first. Disconnect the student agent during a preview session, verify the session stops, and confirm that it cannot resume without a fresh authorized session. Test the student stop button while the network is disconnected. No native keyboard or mouse injection is enabled by this release.

## Limitations
This is source code, not a compiled EXE. Native Windows build and two-machine behavior have not been validated in this environment. The new checks are primarily static regression tests, not Windows integration tests. Remote input stays disabled.
