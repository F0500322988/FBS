# FBS Classroom M149 — Read-only Windows administrator startup audit

This release adds a **separate read-only audit executable** to validate an already provisioned administrator directory. It checks directory ACL, presence and nonempty content of three required files, rejects reparse points for the files, and opens the encrypted state through the existing Windows bootstrap. It does not provision credentials, reset lockouts, enable input injection, or expose network services.

## Windows 11 instructions

Run PowerShell from the `FBS-Classroom` project root using the **same Windows account** that provisioned the private directory:

```powershell
node --test tests/m149-admin-startup-audit.test.js
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M149-Admin-Startup.ps1 -AdminDirectory "C:\FBS-Admin-Private-M148"
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
```

The audit prints PASS on successful read-only validation, FAIL and nonzero exit on failure. It intentionally does not attempt to repair or delete existing files. Do not publish the directory, encryption keys, or credentials. On Windows, test the build and the audit before deployment. Static JS tests do not substitute for Windows runtime validation.

## Known limits

This checks directory permissions and encrypted state at a point in time, not file ACLs individually or protection against privileged tampering and rollback. No teacher-facing network enrollment or native mouse/keyboard injection is enabled. The audit itself must be built on Windows with .NET 8 SDK.
