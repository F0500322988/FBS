# FBS Classroom M121 — Authenticated Preview Transport

## What changed
- `authenticated-preview-transport.js` derives per-device, per-session HMAC keys from the existing LAN pairing secret.
- `teacher-lan.js` signs queued preview commands before returning `/control/commands`.
- `student-agent.js` verifies each signed preview envelope, including device/session/sequence/age, before displaying it in the local preview log.
- Stop and invalid/expired sessions revoke preview verification state. Native mouse/keyboard injection remains **disabled**.
- The fixed `fbs-teacher-lan` identifier is a transport role label, **not** proof of a specific human teacher's identity.

## Windows test
From the FBS-Classroom folder:

```powershell
node --test tests/m121-authenticated-preview-transport.test.js
node --test
```

To attempt Windows installer builds (requires Node.js, .NET 8 SDK and Inno Setup 6):

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Build-Installers.ps1
```

Output is expected under `release\installers` if the build succeeds. No compiled EXE is included in this ZIP.

## Limitations
This is preview-only. It does not grant native remote input. The shared pairing secret and existing enrollment model are not a substitute for independent per-teacher authentication and per-device provisioning. No Windows native build or field test was performed in this Linux environment.
