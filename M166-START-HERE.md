# M166 — Teacher live presence session lifecycle

This update adds authenticated TLS session open/close notifications and per-device active session tracking to the teacher roster. Each session has a random GUID; a stale close cannot remove a newer session for the same device. Heartbeats continue to update the last verified time, and the UI distinguishes an active session with recent heartbeat from a session awaiting heartbeat, a recently closed session, and a disconnected device. A revoked device is never shown as authorized. Stopping the listener clears the session display.

## Windows commands

```powershell
node --test tests/m166-presence-lifecycle.test.js
dotnet build .\windows\FBS.Teacher.Launcher\FBS.Teacher.Launcher.csproj
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
```

The presence session remains **identity-only**; there is no remote input, command dispatch, or screen control. An open session with a recent heartbeat is not a guarantee of real-time connectivity. No .NET SDK is available in the Linux authoring environment; Windows builds and a two-PC network test are still required.
