# FBS Classroom M10 — Native Windows student UI scaffold

This release preserves M9 and adds `windows/FBS.Student.Native` with a WinForms Arabic status window.
It is intentionally not a working remote controller. Do not install it as a Windows service.

## Build
On Windows 11, install the .NET 8 SDK, then in `windows/FBS.Student.Native` run:

```powershell
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true
```

Run the generated EXE from `bin/Release/net8.0-windows/win-x64/publish`.
It displays a tray indicator and a status window; remote input is disabled.

## Required next steps before real control
1. Per-device enrollment and credential revocation.
2. Authenticated, encrypted, replay-resistant command channel with least privilege.
3. Native interactive-session agent, visible control indicator, emergency stop.
4. Windows session/UAC boundaries, code signing, installer, and lab tests.

## Tests
`node --test` (M9's original test suite is run without a teacher password to preserve the demo API test).
