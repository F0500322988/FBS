# FBS Classroom M15 — Windows release assembly

Run `powershell -ExecutionPolicy RemoteSigned -File .\windows\Build-Release.ps1` on **Windows 11 x64** with .NET 8 SDK and Windows Node.js installed.

The script publishes the Teacher launcher and Student native status UI and assembles a `release/Runtime` directory containing the JavaScript runtime and the **Windows** Node.js executable. The Teacher launcher resolves its runtime relative to the assembled folder.

**Current limitations:** This is a developer release folder, **not a one-click installer**. Teacher configuration (pairing key, password, TLS certificate paths) is still required. Student agent installation still uses the existing PowerShell installer and Windows Node.js; the native Student status UI is not integrated with the agent. No real remote mouse/keyboard control exists. M14 identity signatures are not integrated with M13 enrollment. No Windows build was run in this environment.

Before deployment: implement a proper installer, secure configuration storage, enrollment signature verification, signed binaries, per-device revocation, Windows interactive-session control with visible indicator and emergency stop, and test on one student device.
