# FBS Classroom M41 — Native Session Watchdog

This release adds a native fail-closed session watchdog for expiry, local stop, consent revocation and lost agent contact. The WinForms UI uses it for local timeout decisions. It does **not** enable input injection.

Important M40 fix: the .NET native test project now explicitly compiles the production `InputDryRun.cs` class used by its test harness. Previously that source was missing from the test project, preventing a successful native test build.

## Windows 11 validation
Install Node.js and .NET 8 SDK. Run from project root:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M41-Native.ps1 -ReportPath .\m41-native.json
```

The script must pass Node tests, native .NET tests and the Windows Forms student build before reporting success. These Windows tests have not been run in the development container. No real mouse or keyboard control is enabled. Do not deploy to a live classroom until validated on an isolated test PC.
