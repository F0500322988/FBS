# FBS Classroom M62 — Two-PC Runtime Smoke & Field Checklist

This release adds a **real local teacher HTTP smoke test** and a two-PC field checklist. It does **not** demonstrate a successful Windows build, screen sharing on real PCs, or real keyboard/mouse injection.

## On a development computer with Node.js

```powershell
node windows/M62-Runtime-Smoke.js
node --test
```

The smoke test launches the actual `server.js` in demo mode, checks authentication, 21 demo students, session authorization, remote-input disabled, and logout, then stops the server. It binds only to `127.0.0.1`.

## On Windows 11 (teacher and student)

1. Build the M60 distribution using `windows/Test-M60-Runtime.ps1` (requires Node.js and .NET 8 SDK).
2. Create the M61 manifest: `node windows/M61-Manifest.js create dist-m60 dist-m60/m61-manifest.json`.
3. On teacher PC: `powershell -ExecutionPolicy RemoteSigned -File windows/Test-M62-Two-PC.ps1 -Role Teacher`.
4. On student PC: `powershell -ExecutionPolicy RemoteSigned -File windows/Test-M62-Two-PC.ps1 -Role Student -TeacherIP <TEACHER_IP> -ExpectedCertSha256 <TRUSTED_SHA256>`.
5. **Manually** verify actual device discovery, enrollment, screen preview, explicit consent, stop, disconnect timeout. Attach observed evidence before marking any field check passed.

Reports: `m62-report.json` and `m62-m61-<role>.json`. The report always says `fieldTestsCompleted:false` and `readyForLiveInput:false` until field tests are implemented and verified. **Never use demo mode as proof of LAN safety.**

The remote input adapter remains disabled. No Windows EXE was built in this environment.
