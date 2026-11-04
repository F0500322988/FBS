# FBS Classroom M67 — Two-PC field readiness

This stage **does not enable native keyboard or mouse input**. It combines M62 automated readiness reports from both Windows 11 devices with M63 manually observed field reports, and checks the M66 simulation/native-source safety gate.

1. On each physical PC, open PowerShell in the project directory and run:

   `powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M67-Field-Readiness.ps1 -Role Teacher`

   On the student PC, run with `-Role Student -TeacherIP <actual IP> -ExpectedCertSha256 <trusted fingerprint>`.

2. Copy the resulting `m67-teacher-m62.json` and `m67-student-m62.json` to the teacher PC. Ensure M63 manual observation files `m63-teacher.json` and `m63-student.json` were actually completed on physical devices (never mark PASS without testing).

3. Run from the project root:

   `node .\windows\M67-Field-Readiness.js m67-teacher-m62.json m67-student-m62.json m63-teacher.json m63-student.json m67-review.json`

A `reviewPassed: true` result is a **report-consistency review**, not independent verification of the observations, an EXE build, or authorization for remote input. If a check fails, review `problems` and the original M62/M63 reports. Reports are created with no-overwrite protection.

Run automated regression tests with `node --test`. Windows/C# builds and physical two-PC operation must be tested on Windows 11.
