# FBS Classroom M86 — Preview Stability Audit

Run on the **teacher Windows 11 PC** from the project directory, with the teacher server running and students having explicitly consented to previews:

```powershell
$env:FBS_TEACHER_PASSWORD = Read-Host 'Teacher password'
node .\windows\M86-Preview-Stability.js 1 m86-stability-report.json 4 2000 4177
```

Arguments: expected students (1–40), output report path, sample count (2–20), interval milliseconds (500–30000), loopback teacher API port (default 4177). For a 21-PC lab, use `21`; for 40, use `40`. The script polls read-only localhost APIs and logs only aggregate counts, progress and issue codes, never screen images or student IDs. A pass means metadata remained valid and advanced during sampling, **not** proof of smooth video, local consent, or effective student stop. Manually verify on the student's device: consent is required before preview, stop immediately hides preview, and reconnect requires new consent. Remote mouse/keyboard input remains disabled. No EXE or macOS installer is produced by this stage.
