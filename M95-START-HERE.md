# FBS Classroom M95 — Supervised Windows pilot rollout

M95 is an **offline, fail-closed evidence checklist**, not an automated installer or proof of real-device behavior. Do not use it to deploy across the lab without supervising actual Windows 11 tests.

1. Complete M94 and retain `m94-deployment.json` with `passed: true`.
2. On **one teacher PC and two student PCs** (optionally up to five student PCs), manually install the M76 Windows installers built on a Windows build machine. Verify launch, LAN connectivity, TLS fingerprint, explicit student screen-share consent, and immediate Stop Sharing. Keep remote keyboard/mouse control disabled.
3. For each pilot device, test uninstall and a safe rollback/reinstall procedure. Never mark a check true until physically tested; do not enter passwords or pairing keys in the evidence JSON.
4. Copy `windows/M95-Pilot-Evidence.example.json` to `m95-pilot-evidence.json`, add up to five student entries, and mark each check true only when confirmed. `operatorApproved` requires a real human signoff.
5. Run from project root:

```powershell
node .\windows\M95-Pilot-Rollout.js .\m94-deployment.json .\m95-pilot-evidence.json .\m95-pilot-report.json
```

`passed: true` only says supplied M94 and pilot attestations meet this checklist. It does not independently verify installers, physical devices, screen content, bandwidth, or rollback. The report intentionally omits all device IDs. Do not enable remote input. macOS PKG/DMG is a separate, unfinished workstream.
