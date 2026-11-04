# FBS Classroom M68 — physical session evidence

This release adds an **ordered manual observation checklist**, not remote input execution. The teacher and student must be two physical Windows 11 machines with permission to participate. Keep a visible sharing indicator and an immediate student stop button. Do not record passwords, certificates, screen contents or other personal data in notes.

1. Run M67 preflight and review using the previous instructions. Obtain `m67-review.json` with `reviewPassed: true`.
2. From the project root, create the checklist: `node windows/M68-Live-Session-Evidence.js template m68-evidence.json`.
3. On the two devices, execute the 15 steps **in the listed order**. Enter a unique `sessionId` (8–64 letters, digits, hyphens or underscores). For each step enter `PASS` or `FAIL`, an observation note of 8–500 characters, and an ISO-8601 timestamp with timezone, e.g. `2026-11-03T11:00:00+03:00`. Never mark PASS unless observed. Stop testing if student stop does not work.
4. Run: `node windows/M68-Live-Session-Evidence.js verify m68-evidence.json m67-review.json m68-result.json`.
5. `passed: true` means the *submitted observations* meet the checklist; it does not prove real-world functionality or enable native input.

Run automated regression tests: `node --test`.

**Safety:** Windows native keyboard/mouse injection remains disabled. No Windows EXE/installer or macOS PKG/DMG was built in this environment. No physical device testing is claimed.
