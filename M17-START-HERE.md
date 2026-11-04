# FBS Classroom M17 — Student native app starts LAN agent

The Windows native student application now launches the existing Node.js LAN agent in the same signed-in user session. It uses a per-user DPAPI-encrypted pairing key and the Node runtime bundled by Build-Release.ps1. No new listener or remote keyboard/mouse input is enabled.

## Build and test on Windows 11
1. Install .NET 8 SDK, Node.js, and Inno Setup 6.
2. Run `powershell -ExecutionPolicy RemoteSigned -File .\windows\Build-Installers.ps1`.
3. Install the **student preview** on one test PC, as the Windows account that will use it.
4. In the installation folder, run `powershell -ExecutionPolicy RemoteSigned -File .\Configure-Student.ps1` once. Use the same pairing key as the teacher.
5. Sign out and sign back in. Check the tray icon and teacher roster.
6. To share a screen, the student still opens `http://127.0.0.1:4190` and chooses a screen.

## Limitations
- No remote mouse/keyboard control, and no automatic screen capture.
- Windows native UI and network agent share a process lifecycle but not yet a unified native networking implementation.
- Pairing key is scoped to the Windows user. Reconfigure for each Windows user account.
- Requires an actual Windows build and a physical LAN test; the installer and native app have not been built or tested here.
- Per-device cryptographic identity is still not enforced in the LAN transport.
- Windows SmartScreen may warn about unsigned binaries. Code signing is needed before general deployment.
