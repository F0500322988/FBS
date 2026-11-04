# FBS Classroom M137 — Persistent managed enrollment boundary

This release adds `windows/FBS.Student.Native/PersistentManagedEnrollment.cs`, a standalone persistence boundary that clones the allowlist, commits encrypted snapshots before publishing changes, and locks after I/O or decryption failures.

## Important limits

- NOT wired to production HTTP enrollment, teacher authentication, or native input.
- `administratorAuthenticated` is an assertion from the caller, NOT a credential check. Never use untrusted HTTP request data for it.
- The 32-byte encryption key must be protected separately, e.g. by managed provisioning and Windows protected storage.
- A valid old encrypted snapshot could still be restored by someone with filesystem access. Add a trusted monotonic revision/anti-rollback mechanism before production.
- Initialization must use a restricted, administrator-owned directory; this component does not enforce ACLs.
- The program still DOES NOT inject real keyboard or mouse input.

## Tests

```powershell
node --test tests/m137-persistent-enrollment.test.js
node --test
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M129-Native-Safety.ps1
```

The Node tests are static/source-level tests. The Windows/.NET tests must be executed on Windows 11.
