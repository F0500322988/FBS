# FBS Classroom M146 — Existing Administrator Bootstrap

M146 adds `WindowsEnrollmentBootstrap.OpenExisting(directory)` as a **trusted in-process factory** that opens previously provisioned DPAPI credentials, encrypted device registry, and durable lockout state. Missing/corrupt files fail closed. It does **not** automatically expose the enrollment UI, create credentials, or open network ports. The trusted host must provision the files with matching paths and configure the UI explicitly; no complete provisioning workflow is supplied yet.

Also fixes the password-minimum mismatch: DPAPI provisioning now requires 14 characters, matching the PBKDF2 verifier.

On Windows 11 with .NET 8 SDK and Node.js, from the project root:

```powershell
node --test tests/m146-enrollment-bootstrap.test.js
node --test
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M129-Native-Safety.ps1
```

The JavaScript tests inspect source structure; they are **not** Windows runtime tests. The actual administrator bootstrap remains opt-in and is not yet called by the student application. The vault requires the same Windows account that provisioned it; ACL hardening, rollback protection, secure provisioning and teacher-side management remain incomplete. Native mouse and keyboard execution stays disabled.
