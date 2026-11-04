# FBS Classroom M94 — Windows Deployment Gate

This is a **fail-closed offline checklist and evidence gate**, not a native installer build or automated live deployment. Run on Windows 11 after supervised testing.

1. Generate M93 lab readiness report using M84, M91, M92 evidence for your 21 (or 40) students.
2. On a Windows build PC, build M76 packages with `windows/Build-M76-Packages.ps1 -BuildInstallers` (requires the earlier M60 runtime build and Inno Setup ISCC.exe). Run `node .\windows\M80-Distribution-Gate.js .\dist-m76 .\m80-distribution.json --require-installers`. M80 validates file presence and hashes, **not** authenticity or actual installation.
3. Copy `windows/M94-Deployment-Checklist.example.json` to `m94-checklist.json`. **Do not set items to true without manually verifying each item on real lab PCs.** Confirm isolated LAN, teacher IP, UDP 4181 firewall, trusted TLS fingerprint, student consent/stop, teacher and student installation, successful uninstall/rollback, and operator approval.
4. Run:

```powershell
node .\windows\M94-Deployment-Gate.js 21 .\m93-readiness.json .\m80-distribution.json .\m94-checklist.json .\m94-deployment.json
```

`passed: true` means that the supplied M93/M80 reports and operator checklist satisfy the gate; it does **not** prove authenticity, freshness, bandwidth, native installer operation, or student consent. Keep deployment to a supervised pilot before broad rollout. Do not enable remote keyboard/mouse input. Windows EXE creation and Mac PKG/DMG builds require platform-specific environments and testing.
