# FBS Classroom — M36 Native Windows Verification Kit

## What is new
- Standalone .NET 8 console harness compiling the **production** `ControlInputGate.cs` (not a mock).
- 15 runtime assertions for consent, expiry, session isolation, replay protection, stop, and disabled input.
- Windows PowerShell runner executes Node tests, the native harness, and the actual Windows Forms student build.

## Run on Windows 11
Install Node.js and .NET 8 SDK. Open PowerShell at the `FBS-Classroom` root:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M36-Native.ps1
```

## Security boundary
The native harness is **preview-only**. It never calls `SendInput`. The adapter remains disabled, and this is not a Windows installer. A successful test on Windows must be observed before enabling any real remote control. No lab LAN or Windows build has been tested in the packaging environment.
