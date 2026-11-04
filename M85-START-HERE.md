# FBS Classroom M85 — Preview visibility audit

This stage audits the teacher's live, loopback HTTP API. It does not capture or save screenshots, grant consent, enable mouse/keyboard control, or prove that all physical monitors are visible. Device enrollment approval is **not** student consent to screen viewing; keep the student-facing consent/stop UI active.

1. Start the teacher server in live mode and enroll student devices. Have each student explicitly authorize preview using the existing UI.
2. Set `FBS_TEACHER_PASSWORD` in the teacher's terminal (do not put passwords in command history).
3. Run `node windows/M85-Preview-Audit.js 1 m85-preview-report.json` to check one fresh preview. For 21 students use `21`; for 40 use `40` only after every student has consented.
4. Run `node --test` for automated tests.

A passing report checks currently visible, approved, online and fresh preview metadata at one instant. It does not verify stop timing, UI visibility, frame quality, or future availability. The report excludes screenshot bytes and passwords. Do not distribute the report publicly if device IDs are sensitive.
