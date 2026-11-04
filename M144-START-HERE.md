# M144 — Enrollment startup boundary

This update adds a one-shot, fail-closed startup gate for the local enrollment administration dialog.

- The admin UI is hidden and disabled by default.
- Only a trusted in-process host can inject a credential-backed `ManagedEnrollmentCommandService`.
- Duplicate activation is rejected; after form closure, activation cannot be resumed.
- No default password, CLI activation switch, or network enrollment endpoint is added.
- This is **not** full automatic provisioning. The trusted bootstrap and teacher console integration remain to be implemented.
- Native keyboard/mouse injection remains disabled.

## Verify

```powershell
node --test tests/m144-enrollment-startup-gate.test.js
node --test
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M129-Native-Safety.ps1
```

Run .NET build and native smoke test on Windows 11 with .NET 8 SDK. JavaScript tests alone do not prove Windows runtime behavior.
