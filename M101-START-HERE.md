# FBS Classroom M101 — Installed Teacher/Student Pair

This stage combines M100 manual startup evidence for **both roles** with a fresh M84 read-only authenticated teacher loopback API check. It does **not** install software, start an EXE, grant consent, test screen pixels, or enable remote input.

## Windows steps

1. Launch the teacher and student EXEs on their respective Windows 11 machines and run `M100-Live-Startup.ps1` on **each** machine. Use `-ConfirmedVisibleUI -ConfirmedExpectedBehavior` only after checking the UI in person.
2. Copy the student's `m100-student.json` to the teacher machine. Keep the teacher's `m100-teacher.json` there too. Do not use fabricated reports.
3. Ensure the teacher service is running, and the expected student(s) are connected and approved. The local teacher API listens on port 4177 unless configured otherwise.
4. In PowerShell on the teacher machine, set the teacher password for this session: `$env:FBS_TEACHER_PASSWORD = Read-Host 'Teacher password'`.
5. From the project root, run:

```powershell
node .\windows\M101-Installed-Pair-Check.js .\m100-teacher.json .\m100-student.json 1 .\m101-pair.json
```

For more than one student, the **single student startup report is not evidence for every student**. Use M100 on each machine, and M84 for the full target count. `expected` counts approved online students on the teacher API, not independent M100 reports.

`passed: true` means the two supplied M100 reports passed schema validation and the current M84 teacher API snapshot reported the requested number of online approved students. It does **not** prove end-to-end screen preview, physical identity, continuous availability, or real-world Windows operation. A failed check exits nonzero. The output omits passwords, device IDs and screen images. Do not commit private reports or secrets into source archives.

Remote mouse/keyboard control remains disabled.
