# FBS Classroom M72 — One-student session trace review

This stage validates a **manually recorded** preview-only session trace against the prior M71 report. It does not enable native mouse/keyboard input and is not a Windows field-test substitute.

Run from the project root:

```powershell
node --test
node .\windows\M72-Session-Trace-Gate.js template m72-trace.json
```

Replace the sample events with actual observed events from your single-student session. Keep increasing `atMs` values (milliseconds relative to a common observation start), keep the same `studentId`, and record `liveInputEnabled: false` for every event. A valid trace must include a stop or revocation. Do not treat sample template values as field evidence.

```powershell
node .\windows\M72-Session-Trace-Gate.js verify m72-trace.json m71-review.json m72-report.json
```

The validator rejects input attempts, missing consent, unsafe reconnects, missing stop, mismatched student IDs, and timestamps that are not strictly increasing. `passed: true` means only that the supplied trace is internally consistent and the prior review passes. It is **not** authorization to enable native input.
