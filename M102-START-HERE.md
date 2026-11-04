# FBS Classroom M102 — Installed Connection Recovery

M102 is a **read-only operator-guided** test of student disconnect/reconnect against the teacher's local authenticated API. It never disconnects a device automatically, never changes network settings, and never enables remote mouse/keyboard input.

## Windows 11 test

1. Install and launch teacher and student programs. Ensure at least one student is connected and approved, and teacher service is running.
2. Open PowerShell in the `FBS-Classroom` project directory on the **teacher** PC.
3. Set the password for the current PowerShell session: `$env:FBS_TEACHER_PASSWORD = Read-Host 'Teacher password'`.
4. Run `node .\windows\M102-Connection-Recovery.js 1 m102-recovery.json 3 2000`.
5. The tool checks baseline (3 snapshots). When prompted, disconnect **one** student from the network or close its agent, leaving the teacher service running. Type `DISCONNECT`.
6. When prompted, reconnect/restart the student and wait for it to appear approved. Type `RECONNECT`.
7. Review `m102-recovery.json` for `passed: true` and all three phases healthy/outage/recovered as appropriate.

The `expected` argument is the **minimum approved online count before/after the outage**. For a 21-student lab, testing a single disconnect against `expected=21` requires all 21 online at baseline and again after recovery; test one device at a time. Run `node .\windows\M102-Connection-Recovery.js 21 m102-21.json 3 2000` if applicable.

The teacher API is loopback on port 4177 by default; optional fifth argument overrides it. The test requires at least 2 snapshots per phase and 500–30000 ms between snapshots. Ensure the student is truly offline before typing `DISCONNECT`, otherwise the test will fail closed. If teacher API itself becomes unavailable, outage evidence is rejected rather than incorrectly counting it as a student disconnect.

**Limitations:** reports aggregate counts only and cannot prove which student disconnected; other student connections could mask an outage. This does not verify screen pixels, consent, physical identity, or actual Windows deployment. Check UI manually. The tool saves no passwords, device IDs or screen images.
