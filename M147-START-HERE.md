# M147 — Local administrator first-run provisioning

This is an **explicit, local, interactive provisioning CLI** for the existing M145/M146 components. It is **not** an enrollment network API or a teacher login. Native mouse/keyboard injection remains disabled.

## Windows 11 (dedicated administrator account)

1. Install .NET 8 SDK and open PowerShell under the dedicated account that will own the administrator files.
2. Choose a **new, empty directory with restrictive Windows ACLs**. Do not use a shared folder, a student profile, or a publicly writable directory.
3. Run:

```powershell
dotnet run --project .\windows\FBS.Admin.Provision\FBS.Admin.Provision.csproj -- "C:\FBS-Admin-Private"
```

4. Type `PROVISION`, enter and confirm a unique password of at least 14 characters. Password input is hidden and is never passed as a command-line argument.
5. Verify `PASS` and confirm only the dedicated account can read/write the directory. **Do not copy DPAPI files to another Windows account**; they are protected for the current user.
6. Run `dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj` and `node --test`.

## Important limitations

- This tool does not independently verify the directory ACL. An administrator must secure it before provisioning.
- If provisioning fails halfway, the partial files are deliberately retained; do not erase them to reset a lockout or revocation. Recover using an administrator-approved procedure.
- Existing encrypted registry snapshots are not rollback-proof. Physical access or account compromise can defeat local protections.
- Enrollment service is **not connected** to the teacher UI or HTTP endpoints. This tool only initializes its local persistent dependencies.
- The Linux development environment cannot run the Windows-only .NET project; build and runtime testing must be completed on Windows 11.
