# FBS Classroom M74 — Windows native package preflight

This stage adds a read-only preflight for the actual Windows distribution and tests missing/empty EXEs and runtime files. It **does not** run Windows EXEs, prove two-PC connectivity, enable remote input, or replace consent/stop testing.

1. On Windows 11, install Node.js and .NET 8 SDK and build `dist-m60` with `powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M60-Runtime.ps1`.
2. Run `powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M74-Native-Launch.ps1`.
3. Inspect `m74-native-preflight.json` for `passed: true`.
4. On **authorized** teacher and student computers, launch `dist-m60\Teacher\FBS.Teacher.exe` and `dist-m60\Student\FBS.Student.Native.exe` with their shared `Runtime` folder present. Follow existing enrollment, TLS and consent setup. Verify local stop, disconnect, and fresh consent manually.
5. Report launch errors or test results before enabling any live keyboard/mouse input. Live input remains disabled.

Use `node --test` to run the automated JavaScript tests. The preflight checks file presence and SHA-256, not code signing or successful execution.
