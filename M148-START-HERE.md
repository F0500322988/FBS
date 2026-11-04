# M148 — Administrator directory ACL preflight

On Windows 11 with .NET 8 SDK, use a dedicated administrator account and a NEW private directory:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Prepare-M148-PrivateAdminDirectory.ps1 -Path 'C:\FBS-Admin-Private-M148'
dotnet run --project .\windows\FBS.Admin.Provision\FBS.Admin.Provision.csproj -- 'C:\FBS-Admin-Private-M148'
node --test tests/m148-admin-directory-acl.test.js
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M129-Native-Safety.ps1
```

The provisioning executable now checks ownership, writable access rules (including inherited ones), and reparse points **before** asking for a password and again before saving secrets. It rejects unapproved writable principals. It does not automatically change permissions or reset state.

Limitations: This is a local ACL preflight, not a defense against administrators, SYSTEM, malicious privileged software, ACL changes after the check, or rollback of valid encrypted state. Native input injection remains disabled. The PowerShell helper and .NET project have not been executed on Windows in this build environment.
