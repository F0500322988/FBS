# FBS Classroom M54 — Native response race safety

This release hardens the Windows student UI against delayed consent, stop and decline HTTP responses.

- Approval is rejected if the session expires or the local agent has not been heard from for more than 6 seconds while the approval request was in flight.
- A late stop or decline response cannot overwrite the status of a newer active session.
- Native input injection remains disabled. This is a source-code release, not a Windows binary.

## On Windows 11

Install Node.js and .NET 8 SDK, then run from the project directory:

```powershell
node --test
dotnet run --project .\windows\FBS.NativeGate.Tests\FBS.NativeGate.Tests.csproj
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj -c Release
```

Test with one teacher and one student device, verifying consent, delayed responses, disconnect and stop. The C# code has not been compiled in the authoring environment.
