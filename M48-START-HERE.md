# FBS Classroom M48 — Single-device safety preflight

This stage creates a **review-only** safety checklist for a supervised Windows 11 pilot with exactly one student. It **does not** enable mouse or keyboard injection. `WindowsInputAdapter.EnableForVerifiedSession` remains hard-disabled. No Windows binaries were built in this environment.

## On Windows 11
1. Run and document the M46 and M47 physical tests on the same teacher/student pair. Do not mark a check passed without observing it.
2. Install Node.js and .NET 8 SDK and run the earlier native build/test scripts.
3. In PowerShell from the project root:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M48-Preflight.ps1 -TeacherHostName TEACHER-PC -StudentHostName STUDENT-PC -M47ReportPath .\m47-one-student.json -ReportPath .\m48-preflight.json
```

4. The generated report deliberately starts with `not-run` and false confirmations. After supervised manual tests, update only facts directly observed and rerun `node .\single-device-preflight.js .\m48-preflight.json`.
5. A `readyForSupervisedReview` result is **not** an authorization to activate native input. The report is self-asserted and not cryptographically attested; a separate verified runtime safety design and real Windows validation are still required.

Run JavaScript tests with `node --test`. Native C# tests need Windows/.NET and are not validated by Node tests.
