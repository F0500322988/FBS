# M118 — Managed command-channel preflight (preview-only)

This release adds `ManagedCommandChannelGuard.cs` to the Windows student app and integrates it into the existing *preview* command loop. It requires a live, locally authenticated agent connection, local session approval, visible student session banner, valid expiry, non-replayed sequence and an allowed payload before displaying a command preview. Revocation happens on stop, liveness loss or session change. Native SendInput remains **disabled**. This does not yet implement the managed unattended authorization path, cryptographic teacher-to-device command authentication, or actual mouse/keyboard control. Do not deploy as a remote-control product.

## Windows build prerequisites

Install Node.js, .NET 8 SDK and Inno Setup 6. In PowerShell, from the `FBS-Classroom` directory:

```powershell
node --test
powershell -ExecutionPolicy RemoteSigned -File .\windows\Build-Installers.ps1
```

Only if the build succeeds, inspect `release\installers`. The resulting EXEs are unverified here; first test on two Windows 11 lab machines. The stop button must work even if the network drops. Do not enable native injection until a separately tested authenticated teacher-command path and student-side stop enforcement exist.
