# FBS Classroom M156 — Teacher LAN pairing audit UI

This release adds an **opt-in** Arabic Windows Forms dialog to the teacher administrator-audit window. It starts the M155 identity-only TLS listener with an existing encrypted administrator registry, an explicitly selected bind IP/port, and an existing PFX certificate. The UI provides a stop button and cancels listening on close.

## Build and check on Windows 11

```powershell
node --test tests/m156-teacher-pairing-ui.test.js
node --test
dotnet build .\windows\FBS.Teacher.Launcher\FBS.Teacher.Launcher.csproj
```

Run the teacher launcher, choose the local administrator audit window, then choose **اختبار اتصال وهوية أجهزة الطلاب (TLS)**. Select the existing admin directory (under the same Windows user that provisioned the DPAPI vault), select a PFX certificate containing a private key, enter its password, and specify an explicit interface address and port. Default `127.0.0.1:47443` accepts connections only from the same machine. For two-PC testing, use the teacher PC's LAN IP and configure the firewall manually for the selected port. Students must use the M155 `PinnedLanPairingClient` with the pinned certificate SHA-256 fingerprint, the registered device ID, and its private RSA key; no student-facing UI is wired yet.

## Boundaries

- This is **not** an EXE installer. Building requires Windows 11 and .NET 8 SDK; Linux CI only runs JS source checks.
- Identity verification closes the connection and never starts a remote-control session or sends input commands.
- The PFX private key must be protected; the teacher must use a trusted certificate and distribute its fingerprint through an authenticated channel.
- Administrator directory ACL checks are not atomic with subsequent file reads; privileged tampering is not prevented.
- No end-to-end Windows LAN test was performed here. M157 should add a student-side test UI and a genuine two-PC verification procedure.
