# FBS Classroom M143 — Local enrollment UI integration

The student WinForms application now includes a local enrollment management button, hidden and disabled by default. A trusted, locally configured host can call `StudentStatusForm.ConfigureEnrollmentAdministration(ManagedEnrollmentCommandService service)` on a running form to enable the button. Each register/revoke operation still requires the administrator password inside the dialog.

This is an integration seam, **not a complete teacher-console deployment**. The default `Program.Main()` does not provision a service, so the button remains hidden. There is no default administrator password, remote enrollment HTTP endpoint, or actual native mouse/keyboard injection. A subsequent step must safely provision and load the credential verifier, encryption keys and device registry and explicitly configure the form. Do not expose this method to untrusted network requests.

## Checks

```
node --test tests/m143-admin-ui-integration.test.js
node --test
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
```

.NET build and Windows UI tests must be performed on Windows 11 with .NET 8 SDK. The source checks do not prove the WinForms application compiles or runs.
