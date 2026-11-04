# FBS Classroom M127 — Stop integration hardening

This update fixes two session-revival edge cases in the Windows student app:

1. When the local agent reports no active session, the previous session is marked stopped before the UI is cleared.
2. When the agent reports an expired or revoked session, its ID is marked stopped before cleanup.

This prevents an older pending response from reviving a locally closed session. The student emergency stop still disables the native adapter before attempting an HTTP notification.

## Windows 11 verification

From the FBS-Classroom directory:

```powershell
node --test tests/m127-server-stop-tombstone.test.js
node --test
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
powershell -ExecutionPolicy RemoteSigned -File .\windows\Build-Installers.ps1
```

Test with two authorized lab machines: start a preview session, stop it locally, delay/reconnect the network, and confirm the session does not return. Repeat with the teacher ending the session. Do not enable native input injection for these tests.

**Important:** This ZIP contains source code, not a built EXE. Native mouse and keyboard injection remains deliberately disabled. No Windows or .NET build was performed in this Linux environment.
