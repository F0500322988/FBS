# FBS Classroom — M154

This phase adds `TeacherPinnedTlsListener.cs` to the teacher Windows launcher project. It is a deliberately **opt-in, audit-only** TLS listener, not started by `Program.Main`. The caller must supply an explicit local interface IP, TCP port, and server certificate with private key. Wildcard interfaces are rejected. Up to 40 concurrent TLS handshakes can be in progress, with 10-second per-connection handshake timeouts. Connections are closed immediately after handshake; no frames or commands are processed.

## Tests on Windows 11

```powershell
node --test tests/m154-teacher-tls-listener.test.js
node --test
dotnet build .\windows\FBS.Teacher.Launcher\FBS.Teacher.Launcher.csproj
```

These Node tests check source-level guardrails, **not** live TLS behavior. A Windows .NET build and an explicit two-machine integration test are still required. M153's student client is not wired to this listener. Certificate pin provisioning, RSA device challenge/response, replay protection, and authorization are future work. No real mouse/keyboard input is enabled. Do not expose this listener to untrusted networks.
