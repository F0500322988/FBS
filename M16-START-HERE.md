# FBS Classroom M16 — Windows installer build recipes (PREVIEW)

This release provides Inno Setup 6 scripts to create **two Windows installer EXEs**:
- `FBS-Classroom-Teacher-Setup-PREVIEW.exe`: installs teacher launcher and Node runtime files.
- `FBS-Classroom-Student-Setup-PREVIEW.exe`: installs the native student status app and starts it at Windows user login.

## Build on Windows 11
Install .NET 8 SDK, Node.js (Windows x64), and Inno Setup 6. Open PowerShell in the `FBS-Classroom` directory:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Build-Installers.ps1
```

The two setup EXEs will be under `release\installers` if compilation succeeds.

## Important limitations
- No EXE installer binary is included in this ZIP: it must be compiled on Windows.
- The native student status app is **not** yet connected to the LAN agent, so its startup entry does not provide automatic device discovery or screen capture.
- The teacher launcher requires preconfigured `FBS_PAIRING_KEY`, `FBS_TEACHER_PASSWORD`, `FBS_TLS_CERT`, `FBS_TLS_KEY` environment variables and valid TLS files.
- Native remote mouse/keyboard control has not been implemented.
- The M14 signing prototype is not integrated into M13 enrollment.
- These installers are **developer previews**, not a production deployment to 21 or 40 PCs.
- Code signing and security review are still needed before broad distribution.

## Next required milestone
Integrate native student app and the student LAN agent, secure per-device enrollment, then implement and test authenticated remote control with visible indicators and a local stop control.
