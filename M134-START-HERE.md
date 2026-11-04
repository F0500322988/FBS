# FBS Classroom M134 — Device challenge proof foundation

Adds `DeviceChallengeProof.cs`: a 32-byte CSPRNG challenge, RSA-SHA256-PSS signing, and public-key verification. The Windows native smoke harness now checks valid proof, wrong keys, modified challenges, malformed keys, and replay against a fresh challenge. It uses isolated ephemeral keys, never changes actual enrollment or the student identity key.

This is **NOT a complete authenticated enrollment protocol**. A real deployment still needs a trusted enrollment registry, teacher authorization, an authenticated transport, server-generated single-use challenges with expiry and replay storage, and end-to-end Windows field testing. No actual mouse/keyboard injection has been enabled.

From the project root on Windows 11 with .NET 8 SDK and Node.js:

```powershell
node --test tests/m134-device-challenge-proof.test.js
node --test
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M129-Native-Safety.ps1
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
```

Do not interpret the JavaScript source checks as evidence that the C# build or runtime has passed on Windows.
