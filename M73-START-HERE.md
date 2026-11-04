# FBS Classroom — M73 local integration gate

This stage automates the **real local demo server** smoke test from M62 and the **preview-only** session-trace validator from M72. It is not a Windows native build or a physical two-computer test.

Run from the extracted `FBS-Classroom` folder:

```powershell
node --test
node .\windows\M73-Integration-Gate.js m73-report.json
```

The report is written with exclusive creation (`wx`) to avoid overwriting existing evidence. Delete or rename an old report yourself before rerunning. A successful report must say `passed: true`, `realWindowsTested: false`, `twoPcTested: false`, and `liveInputEnabled: false`.

To test Windows native binaries, continue using the M59–M62 scripts on Windows 11. Keep student consent and local stop available. Do not enable native keyboard/mouse input based on this gate.
