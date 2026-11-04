# FBS Classroom M61 — Two-PC release integrity and network verification

M61 adds a SHA-256 integrity manifest for the **built** M60 distribution and a two-PC Windows diagnostic runner. It does **not** turn on real mouse/keyboard input, certify TLS identity without a trusted fingerprint, or replace manual consent/stop testing.

## On the teacher Windows 11 PC

1. Install Node.js and .NET 8 SDK; build the release: `powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M60-Runtime.ps1`.
2. Create manifest: `node .\windows\M61-Manifest.js create .\dist-m60 .\dist-m60\m61-manifest.json`.
3. Start teacher server with your existing TLS, pairing key and teacher password configuration. Never put secrets in the ZIP or reports.
4. Run: `powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M61-Two-PC.ps1 -Role Teacher`.

## On the student Windows 11 PC

Copy the **entire** dist-m60 folder with its manifest to the student PC. Keep the source project folder for the test script. Verify the teacher certificate fingerprint independently (not from the same network connection). Run:

`powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M61-Two-PC.ps1 -Role Student -TeacherIP 192.168.1.10 -ExpectedCertSha256 YOUR_64_HEX_FINGERPRINT`

The script writes M61 JSON and M44 network reports. Manually check enrollment, preview, explicit consent, stop button, expired session, disconnection and no stale reactivation. Network tests are **not** a substitute for real two-PC application tests.

**Status:** No Windows build was performed in the development environment. Live input remains disabled. This is not a signed installer.
