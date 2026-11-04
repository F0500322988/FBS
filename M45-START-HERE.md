# FBS Classroom M45 — Native preview decision audit

Adds a bounded, privacy-preserving native decision counter for preview-only commands. The C# student window displays accepted/rejected counts for a live session; the audit resets when the session ends or changes. It stores only whitelisted result codes, not keys, coordinates, session identifiers, or tokens. Native test project includes coverage for bounds, sanitization, and reset.

On Windows 11 with Node.js and .NET 8 SDK, run from the project root:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M45-Native-Preview.ps1 -ReportPath .\m45-native-preview.json
```

**Safety:** This build does NOT enable SendInput, remote mouse, or remote keyboard. Windows C# compilation and real two-PC tests are still required before deployment.
