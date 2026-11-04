# FBS Classroom M115 — Windows EXE readiness and remote input safety gate

This stage is a **truthful build/readiness audit**, not a finished remote-control release.

## On Windows 11
Install Node.js, .NET SDK and Inno Setup 6. From the project root:

```powershell
node .\windows\M115-EXE-And-Control-Readiness.js
node --test
powershell -ExecutionPolicy RemoteSigned -File .\windows\Build-Installers.ps1
```

If successful, inspect `release\installers` for the two PREVIEW installers. Run them only in a controlled two-device test lab. The teacher launcher may still require Node.js and environment configuration. Do not assume the preview installers contain a complete deployment.

## Mouse/keyboard control status
`WindowsInputAdapter` includes Windows SendInput prototypes, but `EnableForVerifiedSession` deliberately leaves input disabled and `ControlInputGate.InputEnabled` is false. The native adapter is **not connected** to teacher network commands. No real remote mouse/keyboard operation is provided by M115.

Before enabling native input in a later stage: authenticated teacher, approved student, visible session indication, student approval and immediate local stop, bounded command scope, expiry/replay protection, and actual Windows two-PC tests are mandatory.

## Safety
Do not expose the classroom server to the public Internet. Test on devices you own or administer with student knowledge and consent.
