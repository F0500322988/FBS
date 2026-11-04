# FBS Classroom M35 — Signed HTTPS integration test

This release adds a real local HTTPS integration test for the teacher LAN server.

The test creates an **ephemeral self-signed test certificate**, then verifies:
1. Signed heartbeat is accepted; replay is rejected.
2. Control polling is denied until the device public key is approved.
3. A student can poll a pending session and acknowledge consent.
4. A consented session can receive **preview-only** commands once.
5. A signed student stop cancels the session; old commands cannot be fetched.

Run `node --test` from the FBS-Classroom folder. The new test requires `openssl` on PATH and skips when unavailable. All traffic stays on localhost. The certificate is created for testing only and is deleted after the test.

**Limitations:** This is not a two-PC Windows lab test; C# native app and EXE have not been built here. Mouse/keyboard injection is disabled. Student screen capture still needs browser permission. For real-lab testing, use the M34 diagnostics on two PCs and do not distribute to all 21 PCs before testing one student PC.
