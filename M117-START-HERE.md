# M117 — Student session indicator and emergency stop

Adds `ControlSessionBanner.cs`, a topmost Windows Forms indicator shown whenever the native student app observes an active pending/preview session. The banner contains a prominent emergency stop button wired to the existing fail-closed local stop path. It hides when the session clears, expires, or loses contact with the local agent.

## Windows build

From the project root on Windows 11 with .NET 8 SDK, Node.js and Inno Setup 6:

```powershell
node --test
powershell -ExecutionPolicy RemoteSigned -File .\windows\Build-Installers.ps1
```

Inspect `release\installers` for output, and test the student banner and stop with one test PC before deploying to the lab. The banner is a **preview-session indicator**: managed auto-authorization, native keyboard/mouse injection and production EXE binaries are **not implemented or verified** in this release. The student-side emergency stop remains locally effective even when the server cannot be reached.
