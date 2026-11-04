# M51 — Native preview pipeline wired to student UI

The Windows student form now uses VerifiedPreviewPipeline for preview-only commands, instead of its former separate InputDryRun path. It sends a heartbeat on each successful local agent poll and stops the pipeline on session cancellation, rejection, timeout, agent failure or window closure. Locally stopped session IDs are suppressed to prevent stale polling responses from resurrecting them.

**No input injection:** WindowsInputAdapter remains disabled. These are dry-run previews only.

## Windows validation

From the FBS-Classroom folder on Windows 11 with Node.js and .NET 8 SDK:

```powershell
node --test
dotnet run --project .\windows\FBS.NativeGate.Tests\FBS.NativeGate.Tests.csproj
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
```

Test with two real devices and confirm local stop, rejection, and network disconnection before considering live input.
