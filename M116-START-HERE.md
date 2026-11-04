# FBS Classroom M116 — Managed Windows control foundation

Selected mode: **B — managed classroom devices**. Local administrator provisioning is required; a remote teacher request must never silently authorize a new device. A visible student indicator and student emergency stop are mandatory. Authorization expires after at most two minutes and disconnect/indicator loss closes the session. Student emergency stop is sticky for the current provisioning cycle.

## Important limitations

- This milestone adds a **C# policy foundation** and a **readiness checker**, not a working remote mouse/keyboard channel. `WindowsInputAdapter` remains deliberately disabled; do not represent this as working control.
- The policy is not yet wired to the student application, the teacher UI, or a trusted local provisioning process. This is not an end-to-end security feature yet.
- No Windows EXE was compiled in the Linux build environment. Windows 11 with .NET 8 SDK, Node.js and Inno Setup 6 is needed to build and test the installers.

## Verify

```powershell
node .\windows\M116-Managed-Control-Readiness.js
node --test
powershell -ExecutionPolicy RemoteSigned -File .\windows\Build-Installers.ps1
```

The last command must be run on Windows with the prerequisites installed. Preview installers should appear in `release\installers` if compilation succeeds. The preview installers do **not** provide remote control.

## Before enabling real input

Implement authenticated, enrolled-device transport; signed administrator provisioning; local visible session banner with always-available emergency stop; rate limits and keyboard restrictions; short-lived session leases and replay protection; audit and Windows 11 two-PC tests. Only after these pass should native input be enabled.
