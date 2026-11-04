# M120 — Authenticated Preview Channel

Adds `authenticated-preview-channel.js`, an isolated HMAC-SHA256 authenticated **preview-only** command envelope verifier and 16 unit tests. This is not yet connected to the teacher/student transport, enrollment handshake, native Windows input, or Windows EXE installers. The shared key must eventually be provisioned through an authenticated enrollment process and never exposed through HTTP or logs. Do not reuse a static key across students. A student-side stop, disconnect, or missing indicator revokes the verifier until a new instance is created after a fresh authorized session. Replay sequence, 10-second freshness, identity and payload constraints are checked. Native input remains disabled.

Test: `node --test tests/m120-authenticated-preview-channel.test.js` or `node --test`.

On Windows with Node.js, .NET 8 SDK and Inno Setup 6 installed, attempt installer build using `powershell -ExecutionPolicy RemoteSigned -File .\windows\Build-Installers.ps1`. These installers do NOT enable remote mouse or keyboard input. Field testing on Windows is still required.
