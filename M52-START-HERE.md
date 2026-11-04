# FBS Classroom M52 — Local Stop First

## Change
The native Windows student UI now revokes a session **locally before** awaiting HTTP on Stop or Decline. Network failures cannot leave the Stop button re-enabled for a still-active session. Late approval responses cannot restore a stopped session.

## Verification
- `node --test`
- `node --check student-agent.js`
- On Windows 11 with .NET 8 SDK: `dotnet run --project windows/FBS.NativeGate.Tests/FBS.NativeGate.Tests.csproj`
- `dotnet build windows/FBS.Student.Native/FBS.Student.Native.csproj -c Release`

## Limitations
No Windows/.NET build was executed in this environment. No actual OS keyboard/mouse input is enabled. No production EXE is included. Verify the native UI on a real Windows machine before use.
