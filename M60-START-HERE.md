# FBS Classroom M60 — Complete Windows runtime packaging

M59 published EXE binaries but did not package the shared `Runtime` folder required by both launchers. M60 creates `Teacher`, `Student`, and `Runtime` together and checks required files before reporting success.

## Run on Windows 11
Install Node.js and .NET 8 SDK. From the project root in PowerShell:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M60-Runtime.ps1
```

Output: `dist-m60/Teacher/FBS.Teacher.exe`, `dist-m60/Student/FBS.Student.Native.exe`, `dist-m60/Runtime/node.exe` and JS files, plus `m60-runtime.json`. Keep the three folders together.

This is a developer release, **not an installer**. Teacher requires environment variables `FBS_PAIRING_KEY`, `FBS_TEACHER_PASSWORD`, `FBS_TLS_CERT`, `FBS_TLS_KEY`. Student requires one-time pairing configuration. Do not copy secrets into the release. Real mouse/keyboard injection remains disabled.

M60 verifies packaging and runs existing tests, but does not prove LAN connectivity or UI correctness. Test on two Windows 11 machines before rollout.
