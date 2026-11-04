# FBS Classroom M81 — First-run configuration readiness

Run on Windows 11 **after** installing the corresponding M76/M80 role package. The audit reads the current user's student DPAPI key or the teacher's process environment, but never writes secrets to the JSON report. It does not connect to the network, launch the app, or change system settings.

## Student (run as the same Windows user who launches the student app)

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Configure-Student.ps1
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M81-First-Run.ps1 -Role Student -InstallDirectory 'C:\path\to\installed\package' -OutputReport m81-student.json
```

## Teacher

Set `FBS_PAIRING_KEY` (16+ characters), `FBS_TEACHER_PASSWORD`, `FBS_TLS_CERT` and `FBS_TLS_KEY` securely in the **same process environment that will launch the teacher app**. Do not include secrets in screenshots or reports.

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M81-First-Run.ps1 -Role Teacher -InstallDirectory 'C:\path\to\installed\package' -OutputReport m81-teacher.json
```

`-InstallDirectory` should be the parent folder containing `Teacher` or `Student` and `Runtime`. The default path is only a convenience; use the actual installer location. A report with `passed: true` means only that local prerequisites were found. It does **not** prove that TLS, discovery, screen sharing, or remote input works. Remote input remains disabled. Do not share `pairing.dpapi` or private TLS key files.
