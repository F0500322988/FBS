# FBS Classroom — M90 Multi-Student Isolation Audit

This is an operator-assisted **read-only** audit of sequential student consent and Stop Sharing, not a new screen sharing engine. Remote mouse/keyboard remains disabled.

## Windows 11 steps

1. Start the teacher server in **live** mode. Enroll at least two students. Both must be online, with screen sharing consent **OFF**.
2. Open PowerShell in the extracted `FBS-Classroom` folder.
3. Set `$env:FBS_TEACHER_PASSWORD = Read-Host 'Teacher password'`.
4. Run `node .\windows\M90-Multi-Student-Isolation.js STUDENT_ID_1,STUDENT_ID_2 m90-isolation-report.json`.
5. On each named student, explicitly grant consent, confirm `CONSENT` in the console, then press Stop Sharing and confirm `STOP`. Do not grant consent to other students while this audit runs.
6. Check `passed` and `issues` in `m90-isolation-report.json`. The report contains counts and issue codes only, not screenshots, passwords, or student identifiers.

Start with 2 students. For a larger test supply a comma-separated list of up to 40 distinct student IDs. The audit runs sequentially and waits about 6 seconds after each Stop, so a full 40-student run will take several minutes.

## Limitations

- Inspects server API metadata, not pixels, local student UI, or actual LAN throughput.
- Operator must visually verify consent, local Stop, and absence of screen preview after stopping.
- Does not automatically click consent or alter devices.
- Tests run in the development environment; native Windows EXE installers and macOS package are not produced by this stage.
