# FBS Classroom M87 — Student Stop / Preview Revocation Audit

This is an **operator-assisted, read-only** test of whether preview frame metadata stops advancing after a student presses Stop Sharing on their own Windows 11 PC. It does not issue stop commands, change student state, collect images, or enable remote input.

1. Start the teacher server in live mode and a student preview with explicit student consent.
2. On the teacher Windows PC open PowerShell at the `FBS-Classroom` root.
3. Run `$env:FBS_TEACHER_PASSWORD = Read-Host 'Teacher password'`.
4. Run `node .\windows\M87-Student-Stop-Audit.js STUDENT_ID m87-stop-report.json` using the actual student ID shown by the teacher UI.
5. When prompted, press **Stop Sharing on the student device**, observe the student UI stop, then type `STOP` on the teacher PC.
6. The tool waits 6 seconds for old frames to expire, then checks three samples two seconds apart. A passing report contains `passed: true` and no student IDs, screenshots or passwords.

**Important limitations:** this is a metadata-only audit. It cannot independently prove the operator actually pressed Stop, the UI cleared instantly, or that a reconnect requires new consent. Manually verify those on two actual Windows computers. If stop does not work, do not deploy to 21 or 40 PCs. The program must remain preview-only; native keyboard/mouse input stays disabled.
