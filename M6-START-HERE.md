# FBS Classroom M6 — Screen Zoom + Security Gate

## What works
- All M5 functions are retained (LAN discovery, heartbeats, voluntary browser screen capture).
- Click or press Enter on a live screen tile to enlarge it. The enlarged image refreshes with the next frame.
- Closing the dialog returns to the device grid. If the student stops sharing, a clear message is displayed.
- Basic browser security headers added.

## Run
Teacher (PowerShell, inside project folder):
```powershell
$env:FBS_PAIRING_KEY = Read-Host 'Lab pairing key'
node server.js
```
Open http://127.0.0.1:4177 then select **عرض الشاشات**.

Student: use existing M5 student-agent.js and screen-share page at http://127.0.0.1:4190. Updating student files is optional for M6.

## Security blocker — before implementing remote input
**M6 is NOT an encrypted or authenticated remote-control product.** The existing shared-key HTTP traffic sends the key in headers and screen frames in plaintext. Do not use on untrusted networks or with sensitive content. A teacher console bound to loopback does not protect student-to-teacher HTTP traffic.

Required next work: (1) TLS for all agent-to-teacher traffic with pinned teacher identity, (2) per-device enrollment credentials, key rotation and revocation, (3) teacher authorization for each remote-control session, (4) a native Windows agent with visible active-control indicator and audit trail, (5) explicit policy for managed classroom devices and safe termination, (6) load tests for 21–40 machines.

The current agent cannot inject input; browser screen capture cannot perform OS-level remote control. This release deliberately does not expose a fake remote-control button.
