# FBS Classroom M88 — Reconnect Without Consent Audit

This stage adds a **read-only**, operator-assisted test for ensuring a student screen preview does not automatically resume after the student presses Stop Sharing and reconnects without granting fresh screen-sharing consent.

## Run on the teacher Windows 11 computer

1. Start the live teacher server and student agent. Ensure the student has explicitly consented to a preview, which must be visible before starting.
2. Open PowerShell in the `FBS-Classroom` folder and set the password without putting it in command history:

   `$env:FBS_TEACHER_PASSWORD = Read-Host 'Teacher password'`

3. Run `node .\windows\M88-Reconnect-Consent-Audit.js STUDENT_ID m88-reconnect-report.json` and replace `STUDENT_ID` with the student's real ID.
4. At the first prompt, press **Stop Sharing** locally on the student's computer. Verify visually and enter `STOP`.
5. Disconnect and reconnect the student's app/network **without granting new screen-sharing consent**. Verify visually and enter `RECONNECT`.
6. Wait for the audit to sample the server's `/api/status` and `/api/frames`. Inspect `m88-reconnect-report.json` for `passed: true` and `issues: []`.

The tool never issues a stop command, initiates reconnection, changes approval, captures screen images, or enables remote input. It uses only the teacher loopback API, and writes a metadata-only report. **A pass does not prove actual consent enforcement**; the operator must visually verify the student has stopped sharing and the teacher sees no live screen after reconnect. Test only on devices with student permission. The report intentionally omits student IDs, credentials and frame data. If approval remains active or fresh preview frames appear after the grace window, it fails closed.

Run tests with `node --test`. No native Windows installers or macOS packages are built by this stage.
