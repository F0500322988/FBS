# FBS Classroom M64 — Field evidence + native input isolation review

M64 takes **actual M63 Teacher and Student JSON reports**, not verbal success alone, and checks the Windows native adapter source for five fail-closed invariants. It never turns on SendInput.

## Steps on Windows 11

1. Keep both M63 reports from your actual two-PC test. If missing, create templates using `node windows/M63-Field-Evidence.js template Teacher m63-teacher.json` and the Student equivalent; record the results honestly. A template is NOT a passing report.
2. Run `node windows/M64-Safety-Gate.js m63-teacher.json m63-student.json m64-review.json` from the FBS-Classroom directory.
3. Inspect `m64-review.json` and retain it with the M63 reports. The command exits nonzero for missing, incomplete, or failing evidence or a modified native input guard.
4. Run `node --test` to execute the Node regression suite. Run the M60/M62 Windows build and two-PC tests separately; M64 does not replace them.

`reviewPassed` means only that both manually recorded field reports are complete and the checked source patterns remain fail-closed. `readyForLiveInput` and `liveInputEnabled` always remain false. Do not distribute as a production classroom control product until Windows builds and real-device tests pass.
