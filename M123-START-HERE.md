# FBS Classroom M123 — Native preflight integration (dry run)

This stage connects `NativeInputPreflight` to the real student polling path, **after** the existing authenticated-preview checks. It adds a second policy decision for incoming preview commands, rejects any command failing it, and revokes the evaluator when the session ends, loses approval, disconnects, or the student presses stop.

**Important:** This is **not** remote control. The preflight's `NativeInputEnabled` is still `false`; the Windows input adapter is still disabled. The existing consent-based session state is still `consented-no-input`. This does not establish a verified managed-device operator authorization protocol or prove the teacher's cryptographic identity by itself. Do not deploy as remote control.

## Verify on Windows 11

```powershell
node --test tests/m123-native-preflight-integration.test.js
node --test
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
```

To build **preview** installers, install Node.js, .NET 8 SDK, and Inno Setup 6, then run:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Build-Installers.ps1
```

Check `release\installers` if successful. This environment did not run .NET or Windows installers. Before native input is enabled, a full authenticated managed-device authorization mechanism, an effective visible stop control, and end-to-end Windows tests are required.
