# FBS Classroom M47 — one-student physical rehearsal (review-only)

## Scope
One teacher Windows 11 computer and exactly one student Windows 11 computer on the authorized training-lab LAN. Keep WindowsInputAdapter disabled. **No real mouse/keyboard injection**. No unattended installation.

## Procedure
1. On both computers install Node.js and .NET 8 SDK; run `windows/Test-M46-Readiness.ps1` on the teacher. Inspect its JSON; build/test statuses must actually pass. The M46 physical checks are never automatically marked passed.
2. Start the teacher service on the teacher PC using the existing project instructions. Confirm the certificate SHA-256 fingerprint independently on the teacher console; do not disable TLS validation.
3. On the student PC run the existing M44 network check with `-Role Student -TeacherIP <teacher-ip> -ExpectedCertSha256 <trusted-fingerprint>`. Confirm it succeeds.
4. In the teacher UI, discover **one** student and explicitly enroll it. Verify the expected identity and visible student consent prompt.
5. With student consent, send a **preview-only** command. Confirm the student UI receives it but does not move the pointer or type.
6. Student clicks Stop. Confirm the teacher sees stop, and a stale preview command is rejected. Start a new session only with new consent.
7. Disconnect the student's network cable or disable its adapter temporarily. Confirm session closes and does not resume automatically when connection returns.
8. On teacher run `powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M47-One-Student.ps1 -StudentHostName STUDENT-PC -M46ReportPath .\m46-readiness.json -ReportPath .\m47-one-student.json`.
9. The report intentionally starts with `not-run`. Only after **personally observing** each step, change the corresponding fields to `passed`, set `observerConfirmed` to true, and separately update M46 evidence with actual observed results (including `realWindowsTwoPc=true`). Re-run `node one-student-rehearsal.js m47-one-student.json`.

The result is a documentation/readiness review only, NOT cryptographic proof that physical testing occurred. It never activates OS input. Do not claim readiness based on edited JSON alone. Share the actual reports and errors for review before M48.
