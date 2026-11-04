# M167 — Disconnect detection and socket cleanup

This update closes all tracked teacher-side TCP/TLS sockets when the listener is cancelled or disposed. Each accepted socket is registered before its handler starts, and each handler removes it and releases its connection slot in `finally`. Cancellation also registers a socket-dispose callback so blocked TLS reads terminate promptly rather than waiting for the normal heartbeat timeout. The existing authenticated presence protocol still bounds missed heartbeats and rejects malformed frames. The roster's existing session-close event remains in the presence handler's `finally` block.

## Run checks on Windows 11

```powershell
node --test tests/m167-disconnect-cleanup.test.js tests/m166-presence-lifecycle.test.js
node --test tests/*.test.js
dotnet build .\windows\FBS.Teacher.Launcher\FBS.Teacher.Launcher.csproj
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
```

## Two-PC manual acceptance test

1. Start identity-only persistent presence on the teacher and connect a previously enrolled student.
2. Verify the student's heartbeat and connected state.
3. Disconnect the student's network cable/Wi-Fi. Verify the roster moves to disconnected after the bounded heartbeat timeout; no session should remain permanently active.
4. Restore the network and reconnect the student; verify a new session ID and fresh heartbeat. An old close must not remove the newer session.
5. Stop the teacher listener while connected; verify prompt disconnection, no stale roster state, and successful listener restart.
6. Repeat with a revoked device; it must never appear authorized.

**Limitations:** Static JavaScript tests cannot prove Windows .NET compilation or real network behavior. Run the builds and the two-PC acceptance test before deployment. No remote input, screen control or command dispatch is enabled.
