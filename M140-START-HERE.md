# M140 — fail-closed restart of administrator lockout state

M139 created encrypted lockout state but the constructor treated a missing state as fresh provisioning. M140 introduces `AuthenticatedEnrollmentService.OpenExisting(...)` for restarting an existing installation: a deleted or corrupt attempts file locks down enrollment/revocation instead of resetting the password failure count.

IMPORTANT: existing applications must use `OpenExisting` on every restart; the constructor that creates the file is only for first-time provisioning. This is NOT wired into a production HTTP enrollment endpoint. A trusted installer must persist the verifier, encryption key, and first-install marker securely. A rollback of an older valid encrypted file remains an unsolved risk; file ACLs and external anti-rollback anchoring are required.

Run `node --test tests/m140-lockout-restart.test.js` and `node --test`.
On Windows 11 with .NET 8 SDK run `powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M129-Native-Safety.ps1` and `dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj`.

Native mouse and keyboard injection remains disabled. This release does not contain prebuilt EXE installers.
