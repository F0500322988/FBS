# FBS Classroom M122 — Native Input Preflight (dry-run)

This milestone adds `windows/FBS.Student.Native/NativeInputPreflight.cs` as a fail-closed decision layer for a **future** Windows native input integration. It checks enrolled device, authenticated teacher and local agent, operator authorization, visible session banner, expiry, exact session identity, sequence replay, local emergency stop, and agent connection. It does **not** execute Windows input and is not yet connected to the student runtime.

## Verify

From the `FBS-Classroom` directory on Windows with Node.js:

```powershell
node --test tests/m122-native-input-preflight.test.js
node --test
```

For a real C# build, install .NET 8 SDK on Windows and run:

```powershell
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
```

To attempt building EXE installers, install Node.js, .NET 8 SDK and Inno Setup 6, then run:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Build-Installers.ps1
```

Check `release\installers` for output. Neither the native build nor installer build was run in this Linux environment. Do not deploy as a working remote-control product: the input adapter intentionally remains disabled, and end-to-end Windows validation is outstanding.
