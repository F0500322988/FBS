# FBS Classroom M53 — Local Consent Latch

This update makes native preview acceptance dependent on **local, session-specific confirmation** of the student's approval request. The teacher server status alone is insufficient. Local stop/decline, agent loss and expired sessions close the local latch; delayed confirmations cannot reopen them. No mouse or keyboard injection is enabled.

## Windows 11 checks

From the `FBS-Classroom` directory, with Node.js and .NET 8 SDK installed:

```powershell
node --test
dotnet run --project .\windows\FBS.NativeGate.Tests\FBS.NativeGate.Tests.csproj
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj -c Release
```

The C# checks and Windows build must be run on a Windows machine; they were not run in the packaging environment. Test the student stop button and network loss with a real teacher/student pair before enabling OS input.
