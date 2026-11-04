# FBS Classroom — M71 Stop / Reconnect Review

M71 checks that your M70 physical two-PC observations and their verified report agree, and checks the Windows native input adapter remains explicitly disabled. It does not run remote keyboard/mouse control or measure stop latency automatically.

From the FBS-Classroom directory:

```powershell
node --test
node .\windows\M71-Stop-Review.js m70-evidence.json m69-report.json m70-result.json m71-review.json
```

All three input reports must be from the actual previous stages, and the output must not exist already. A passing report means the supplied self-reported evidence is internally consistent, **not** that physical performance or live remote control is certified. Send `m71-review.json` and any Windows issues for the next stage.
