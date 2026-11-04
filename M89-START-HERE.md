# FBS Classroom M89 — Fresh Consent and Second Stop Audit

M89 adds a **read-only**, operator-assisted test for a complete consent cycle: the student is online after reconnection with screen consent OFF; they explicitly grant NEW screen-sharing consent; the teacher observes fresh preview metadata; the student presses Stop Sharing a second time; no new preview is accepted after the grace window.

## On the Windows 11 teacher machine

1. Start the live teacher service and student agent. Complete M88 first. Ensure the student is online, with screen-sharing consent **OFF**.
2. In PowerShell inside `FBS-Classroom`, set `$env:FBS_TEACHER_PASSWORD = Read-Host 'Teacher password'`.
3. Run `node .\windows\M89-Fresh-Consent-Cycle.js STUDENT_ID m89-consent-cycle-report.json` with the real student ID.
4. At the `CONSENT` prompt, explicitly approve screen sharing on the **student's computer**, verify the teacher sees the preview, then enter `CONSENT`.
5. The audit collects three preview samples. At the `STOP` prompt, press **Stop Sharing** on the student device, verify the UI stopped, and enter `STOP`.
6. Inspect `m89-consent-cycle-report.json`. `passed: true` means server metadata showed a fresh frame after new consent and no continued sharing after the second stop.

**Limitations:** This test cannot prove consent UI behavior or physical screen contents; verify visually on both devices. It never initiates consent, sharing, or stop; does not capture screen images or log student IDs; and leaves remote mouse/keyboard input disabled. Its server metadata checks do not replace live device tests. This stage does **not** build Windows EXE or macOS PKG/DMG installers.

Run all automated tests with `node --test`.
