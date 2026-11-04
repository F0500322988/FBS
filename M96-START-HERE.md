# FBS Classroom M96 — Staged Rollout (Windows 11)

This release adds an **offline staged-rollout evidence gate**, not a remote installer or an EXE. The entire source tree is included. M96 does not execute software or change any device.

## Prerequisites

- A passed `m94-deployment.json` for the target capacity.
- A passed `m95-pilot-report.json` with one teacher and 2–5 students.
- A passed `m80-distribution.json` created with `--require-installers` and actual installer hashes.
- A manually completed rollout plan. Never mark a check true before testing it on actual Windows PCs.

## Example for 21 student PCs

Copy `windows/M96-Rollout-Plan.example.json` to `m96-plan.json`. The example waves contain 3 + 8 + 10 students. Complete each wave sequentially and verify the installer hash, installation, LAN/TLS, consent/stop, and uninstall/rollback before marking the wave approved. The first wave is limited to 2–5 students; later waves to 10 each.

```powershell
node .\windows\M96-Staged-Rollout.js 21 .\m94-deployment.json .\m95-pilot-report.json .\m80-distribution.json .\m96-plan.json .\m96-rollout-report.json
```

For 40 students, change capacity to 40 and configure waves summing to 40 (e.g. 3, 7, 10, 10, 10). M96 fails closed on missing attestations, capacity mismatch, missing installer hashes, or remote input enabled.

**Security:** no passwords, student IDs, or screen captures are copied into the output. Real mouse/keyboard remote control remains disabled. A `passed: true` result is a check of supplied reports and operator attestations, not independent evidence that devices were installed or tested. Do not deploy to all devices solely because the report passes.
