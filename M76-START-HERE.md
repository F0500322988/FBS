# FBS Classroom M76 — Windows distribution staging

This release fixes the Teacher installer executable name and stages independent Teacher/Student packages with their own Runtime. **It does not contain prebuilt EXE files**. Windows 11 + Node.js + .NET 8 SDK are needed to publish the C# binaries. Inno Setup 6 (`ISCC.exe`) is optional for installer EXE generation.

From the project root in PowerShell:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M60-Runtime.ps1
powershell -ExecutionPolicy RemoteSigned -File .\windows\Build-M76-Packages.ps1
```

This creates `dist-m76/` with separate `FBS-Classroom-Teacher-M76-Portable.zip` and `FBS-Classroom-Student-M76-Portable.zip`, checksums, and verification reports. **Portable ZIPs are not installers**. The script refuses an existing output directory to avoid mixing stale files.

For actual Windows installer EXEs, install Inno Setup 6 and ensure `ISCC.exe` is on PATH, then use a fresh output directory:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Build-M76-Packages.ps1 -OutputDirectory .\dist-m76-installers -BuildInstallers
```

Installer creation does not attest successful installation or classroom operation. The Teacher needs TLS certificate/key, pairing key and teacher password in its environment; Student pairing must be configured for the signed-in user with `Configure-Student.ps1`. Student installer does not silently auto-start. Confirm the visible consent and stop controls in a lab test. Actual mouse/keyboard injection remains disabled.

Run tests: `node --test`.
