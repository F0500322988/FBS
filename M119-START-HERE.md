# M119 — Managed identity binding foundation (not live remote control)

This release adds `windows/FBS.Student.Native/ManagedIdentityBinding.cs`, a fail-closed policy for checking that an already-authenticated teacher, enrolled device and session are consistently identified in future command envelopes. It is intentionally NOT wired into the current preview pipeline: the existing local agent has not yet established cryptographically authenticated teacher-to-device command transport. Simply trusting an incoming `teacherId` would be insecure.

## Security boundaries
- This component cannot authenticate a teacher or prove enrollment by itself. Its boolean prerequisites MUST come from independently verified credentials, not from a received command.
- It revokes on lost authenticated transport, hidden indicator or student stop.
- It does not enable SendInput or any mouse/keyboard injection.
- No installer EXEs are included. Windows builds require Node.js, .NET 8 SDK and Inno Setup 6.

## Test
From the project directory: `node --test`.
To attempt a Windows installer build: `powershell -ExecutionPolicy RemoteSigned -File .\windows\Build-Installers.ps1`.

## Next engineering step
Implement authenticated teacher-to-device transport, bind the authenticated teacher identity to the device enrollment and session, connect this guard to that verified channel, and perform real Windows 11 two-machine stop-button and network-loss tests before enabling any native input.
