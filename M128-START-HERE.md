# M128 — Native input fail-closed startup probe

This release integrates a native input safety probe into the Windows student application's startup. It **does not enable remote mouse/keyboard control**. The probe disables the Windows adapter and checks that mouse and keyboard calls return false. If any check fails, the student application refuses to start.

## Windows 11 validation

From the FBS-Classroom project root:

```powershell
node --test tests/m128-native-safety-probe.test.js
node --test
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
powershell -ExecutionPolicy RemoteSigned -File .\windows\Build-Installers.ps1
```

.NET 8 SDK and Inno Setup 6 are required for Windows builds; Node.js is required for the JavaScript tests and build pipeline. Only after the installer build succeeds should you inspect `release\installers` for EXE files.

On a **test student PC**, launch the student app and confirm it starts with remote input disabled. Press the stop control in a preview session and verify it remains stopped after disconnect/reconnect. The startup probe is not proof that native input works, that an installer runs, or that emergency stop prevents all OS-level input once enabled. Do not deploy native control until end-to-end Windows tests, authenticated enrollment, and immediate local-stop verification have passed.
