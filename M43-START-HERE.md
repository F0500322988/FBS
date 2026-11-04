# FBS Classroom M43 — LAN integration rehearsal (preview only)

Adds `tests/m43-lan-integration.test.js`: an actual loopback HTTPS test using signed Ed25519 requests from two independent simulated students. It checks enrollment, per-device command isolation, explicit consent/denial, student stop, stale response rejection, and creation of a fresh session. **No input is executed**.

Run `node --test` and `node --check student-agent.js`. OpenSSL is required for the HTTPS integration test; it will SKIP if unavailable.

Windows helper: `powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M43-Integration.ps1 -TeacherIP <teacher-ip>` (omit TeacherIP for local tests only). This tests TCP reachability but does NOT independently verify remote TLS fingerprint, signed enrollment, native C# builds or screen streaming.

Before real deployment, run the M34 network diagnostic on both PCs, the M41 native C# tests, verify signed enrollment, consent and stop on actual hardware. Keep input injection disabled.
