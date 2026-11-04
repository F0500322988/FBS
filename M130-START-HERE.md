# FBS Classroom M130 — Multi-session Stop Ledger

## Change
`StopRaceGuard` now remembers **all** locally stopped session IDs for the
lifetime of the student process. Previously only the most recently stopped ID
was retained, so an old session could pass the guard after a second stop.

A maximum of 4096 distinct stopped IDs is allowed. Once exceeded, the guard
fails closed: no session may be applied until the agent is restarted. The
ledger is intentionally not persisted across process restarts; server-side
session authorization and expiration are still required.

## Windows 11 test (PowerShell)
From the `FBS-Classroom` project root:

```powershell
node --test tests/m130-multi-session-stop-ledger.test.js
node --test
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M129-Native-Safety.ps1
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
```

The M129 native smoke project now includes M130 multi-session regression cases.
Requires .NET 8 SDK on Windows 11. The smoke test does **not** inject input.

## Limitations
- No Windows build or Windows runtime test was performed in the Linux authoring environment.
- Native mouse/keyboard injection remains disabled by design.
- These tests do not prove authentication or enrollment and are not a substitute
  for real network fault-injection and UI tests on managed lab machines.
