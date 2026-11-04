# M126 — Local Stop / Pending Poll Response Integration

This release strengthens the Windows student agent against a delayed HTTP polling response arriving after a local emergency stop. The student snapshots a stop-generation before awaiting the local agent, rejects a reply if the generation changes during the await, and rechecks session expiry and stopped identity before updating session state.

No keyboard/mouse injection is enabled. This is a source project, **not** a compiled EXE. On Windows 11, with Node.js and .NET 8 SDK:

```powershell
node --test tests/m126-poll-response-guard.test.js
node --test
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
```

For installer builds, also install Inno Setup 6 and run `powershell -ExecutionPolicy RemoteSigned -File .\windows\Build-Installers.ps1`.

Windows field validation is required: begin a preview session, interrupt the local agent or delay its response, press emergency stop while a poll is outstanding, verify no old session reappears. Do not enable native input until the full authenticated controller, local-stop behavior, and Windows test matrix are validated.
