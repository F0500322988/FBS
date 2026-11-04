# M129 — Windows native safety smoke test

This stage adds a **Windows-only runtime test** that compiles and executes the actual student native-input adapter, startup safety probe, stop-race guard, and polling guard. It is not merely a source-code pattern check.

## Windows 11 procedure

Install .NET 8 SDK and Node.js. From the extracted `FBS-Classroom` folder:

```powershell
node --test tests/m129-windows-native-smoke.test.js
node --test
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M129-Native-Safety.ps1
```

The final command compiles and runs the smoke test on Windows and must print `PASS`. It returns a nonzero exit code if any check fails. This test deliberately **never enables native input**, moves the mouse, or types keys. The actual input execution path remains disabled.

To attempt building the student application and installer on Windows with Inno Setup 6:

```powershell
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
powershell -ExecutionPolicy RemoteSigned -File .\windows\Build-Installers.ps1
```

Inspect `release\installers` only after a successful build. Do not treat this smoke test as proof that remote control or installers work on all student devices. Test a teacher and one disposable student workstation, including emergency stop and network loss, before deployment.
