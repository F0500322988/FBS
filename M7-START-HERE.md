# FBS Classroom M7 — Experimental encrypted LAN transport

This update upgrades student-to-teacher heartbeat and frame traffic from HTTP to HTTPS (TLS 1.2+).
Teacher advertisements include an HMAC-authenticated SHA-256 fingerprint of the teacher certificate.
The student verifies the fingerprint when TLS connects.

## Teacher
1. Install Node.js and OpenSSL.
2. Run `powershell -File .\windows\Generate-Teacher-Certificate.ps1`.
3. In PowerShell, set `$env:FBS_TLS_CERT=(Resolve-Path .\certs\teacher-cert.pem).Path`
   and `$env:FBS_TLS_KEY=(Resolve-Path .\certs\teacher-key.pem).Path`.
4. Set `$env:FBS_PAIRING_KEY` to the same secret used by your student agents (at least 16 characters).
5. Run `node server.js`; open http://127.0.0.1:4177 locally.

## Student
Use the updated `student-agent.js` on ONE test PC first. Preserve the existing pairing key.
Existing installed M6 student agents will not communicate with the HTTPS-only M7 teacher until updated.

## Security and limitations
- Experimental TLS transport, **not production-ready identity management**.
- All students still share a pairing secret; per-device certificates/enrollment and revocation are not implemented.
- The local teacher browser UI has no authentication, but binds only to loopback. Protect the teacher OS account.
- Student localhost capture page remains on loopback HTTP, while the LAN frame transport is HTTPS.
- Remote mouse/keyboard control is NOT implemented. Do not expose this service to the internet.
- Do not install this as a background Windows service; screen capture and input control need explicit interactive-session design.
- Test using a non-sensitive screen before any production use.
