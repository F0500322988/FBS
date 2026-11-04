# FBS Classroom M150 — Teacher Local Admin Audit

This milestone adds a **read-only local administrator audit window** to the Windows teacher launcher. Choose Yes at startup to open the audit window, or No to start the existing teacher server. The audit window uses an existing `FBS.Admin.Audit.exe` installed alongside the teacher executable. It never changes enrollment, starts a new network endpoint, or prints credentials.

## Windows commands

```powershell
node --test tests/m150-teacher-admin-audit.test.js
node --test
dotnet build .\windows\FBS.Teacher.Launcher\FBS.Teacher.Launcher.csproj
dotnet publish .\windows\FBS.Admin.Audit\FBS.Admin.Audit.csproj -c Release -r win-x64 --self-contained false -o .\release\admin-audit
```

For local integration testing, copy the published `FBS.Admin.Audit.exe` and its required publish output to the teacher launcher output directory. The audit must be run under the same Windows identity that provisioned the DPAPI data. **The existing installer does not yet automatically package this auditor**. Do not copy only the EXE if its runtime dependencies are absent.

This milestone is not remote device management, not a completed enrollment UI, and not actual mouse/keyboard injection. Windows/.NET compilation and integration require validation on Windows 11.
