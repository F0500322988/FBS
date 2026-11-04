# FBS Classroom M50 — Native Preview Pipeline

## What changed

`VerifiedPreviewPipeline.cs` combines the existing native payload validation, replay gate, single-student local-approval guard, heartbeat timeout and bounded decision-only audit into one fail-closed preview pipeline. No Windows input injection is invoked. A stopped session ID cannot be reopened; a fresh session can be started.

## Run on Windows 11

Install Node.js and .NET 8 SDK. From `FBS-Classroom`:

```powershell
node --test
node --check student-agent.js
dotnet run --project .\windows\FBS.NativeGate.Tests\FBS.NativeGate.Tests.csproj
 dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
```

These commands run local tests and build the app; they do not perform an actual two-PC network test or enable real mouse/keyboard input. Do not deploy to a classroom before completing the M44–M48 physical-device verification and validating the Windows build.
