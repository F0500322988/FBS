# FBS Classroom M70 — Stop-response field evidence

This stage records **human observations** from two Windows 11 computers; it does not automate the native input adapter, measure system latency, or prove instantaneous stop. Remote keyboard/mouse input stays disabled.

## Steps

1. On the teacher computer, retain the genuine successful `m69-report.json` from your M69 field review.
2. In PowerShell, from the project root:

   ```powershell
   node .\windows\M70-Stop-Response-Evidence.js template m70-evidence.json
   ```

3. Test one student at a time on two physical Windows 11 computers. Observe four scenarios in listed order: student Stop, teacher ending session, network disconnect, and reconnect without renewed consent. Never label a step PASS unless both displays show the expected safe result. Record trigger and confirmation times in ISO 8601 format including timezone (for example `2026-11-03T10:30:00+03:00`). These are manual estimates, not instrumented measurements. Enter a meaningful observation note from each device. Use a new consent before each scenario requiring preview.
4. Verify:

   ```powershell
   node .\windows\M70-Stop-Response-Evidence.js verify m70-evidence.json m69-report.json m70-result.json
   node --test
   ```

A failed or incomplete observation yields a nonzero exit status and a report with issues. The 30-second limit only rejects obviously invalid manual intervals; **it is not an acceptable security latency or a claim of immediate revocation**. Stop testing if preview remains visible after Stop or network loss, and report the behavior for remediation.

M70 does not create final EXE installers or a macOS DMG/PKG.
