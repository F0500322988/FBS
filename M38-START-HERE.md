# M38 — One-student native session simulation

This release adds a fail-closed **session tombstone** to the native preview gate. A stopped session ID cannot be reactivated by a delayed approval/poll; a new ID is required. The tombstone set is process-local, so it is not a substitute for server-side revocation and is not persisted after restart.

On Windows 11 with Node.js and .NET 8 SDK, from the project root:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M38-One-Student.ps1 -ReportPath .\m38-one-student.json
```

The script runs Node tests, native gate simulation and a native student build. **No OS mouse or keyboard input is injected.** This is a local simulation, not a verified two-PC LAN test. Share the JSON report and any build errors before enabling experimental OS input.
