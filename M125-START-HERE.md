# FBS Classroom M125 — Stop Race Guard

This release adds a fail-closed local stop generation guard to the Windows student UI. It prevents late approval HTTP responses and stale session polls from rearming the same stopped session. It does not enable native mouse or keyboard input.

## Verify

From the FBS-Classroom folder:

```powershell
node --test tests/m125-stop-race.test.js
node --test
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
powershell -ExecutionPolicy RemoteSigned -File .\windows\Build-Installers.ps1
```

The last two commands require Windows, .NET 8 SDK and installer prerequisites. Only use an isolated student test device. Stop locally while an approval request is pending and verify that delayed replies do not restore the session. The project archive is not a built EXE.
