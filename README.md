# FBS Classroom

Local-network classroom management software for separate Windows and macOS labs, targeting up to 40 student endpoints per lab.

## Status
M179 adds a persistent library of up to ten named lab organization presets. Load a preset into an editable draft, review it, then explicitly save to apply. Library deletion leaves the current lab and enrollment untouched. Current M177 settings retain their schema and file; the separate library uses atomic replacement and revision checks. See [M179-START-HERE.md](M179-START-HERE.md).

All 1489 JavaScript checks and Chromium acceptance passed. Windows CI [41975128335](https://github.com/F0500322988/FBS/actions/runs/41975128335) passed 155 .NET checks, the persistence/API tests and actual installer execution, installed payload hashing (97 files), bundled Node execution and uninstall/unknown-file preservation. The POSIX-only symlink check was explicitly skipped on Windows.

Final Mac Universal packages passed build, PKG/DMG payload verification, installation/removal, local runtime checks, 23 Swift configuration checks and eight file-save checks on Intel and Apple Silicon hosted runners. Download [the final Intel-built Universal packages](https://github.com/F0500322988/FBS/releases/tag/m179-macos-preview-18-1); the [Apple Silicon validation build](https://github.com/F0500322988/FBS/releases/tag/m179-macos-arm-preview-6-1) independently passed. One earlier ARM packaging attempt failed after signing; retry passed without changing application code, and the original cause remains unconfirmed.

Windows installers are unsigned; Mac uses ad-hoc signatures without Developer ID/notarization. Full student application GUI, Keychain, screen-recording permissions, physical mixed-device LAN and 40-device acceptance remain untested. The M178 overlay is not an OS account lock; remote input and OS account locking remain incomplete. Organization presets do not isolate network keys or enrollment. Older milestone notes are historical.

## Components
- `src/shared`: protocol contracts and security requirements
- `src/teacher`: teacher console (planned)
- `src/agent`: student endpoint agents (planned, OS-specific)
- `docs`: architecture and implementation backlog
- `tests`: test planning

## Recommended implementation
- Windows: .NET 8+ with Windows-native capture and input APIs.
- macOS: Swift with ScreenCaptureKit and explicit system permissions.
- Local discovery: mDNS or administrator-configured endpoints.
- Transport: mutually authenticated TLS with enrollment and role checks.
- Avoid relying on multicast for all screen streams; benchmark real network capacity.

## First milestone
Build a secure enrollment and heartbeat prototype before implementing screen capture.

## Runnable M1 UI prototype (added)
Requirements: Node.js 20+; no third-party packages.

```bash
FBS_DEMO=1 node server.js
```

Open `http://127.0.0.1:4177` on the **same computer**. Demo mode displays 21 simulated devices (one offline). Use `FBS_DEMO=0 node server.js` to start with an empty list. This server deliberately binds only to loopback. **It does not discover real devices, authenticate teacher/agent sessions, stream screens, control devices, or install software.** Do not expose it to the LAN or Internet; a later milestone must add authenticated encrypted LAN enrollment before connecting real agents.

Run automated smoke tests: `node --test tests/server.test.js`.

## M2 experimental LAN discovery (Node.js, no screen sharing yet)

The teacher and agents automatically read active non-loopback IPv4 addresses. The teacher broadcasts a signed discovery announcement every 3 seconds over UDP 4181; an agent verifies its HMAC and freshness and sends an authenticated heartbeat to TCP 4180 every 5 seconds. This is an experimental prototype, not production-grade enrollment: a shared key is provisioned manually and can be extracted from a student machine. Do not expose these ports to the Internet. Use a firewall restricted to the classroom LAN. This is separate from the M1 browser dashboard and **does not yet feed its roster**.

On teacher (PowerShell):
```powershell
$env:FBS_PAIRING_KEY='replace-with-a-long-random-private-secret'
node teacher-lan.js
```
On each student (PowerShell):
```powershell
$env:FBS_PAIRING_KEY='replace-with-the-same-private-secret'
node student-agent.js
```
Run `node --test tests/*.test.js` for tests. Allow UDP 4181 inbound on students and TCP 4180 inbound on teacher in Windows Firewall. Broadcast discovery requires that hosts can receive LAN broadcast; some VLAN/firewall setups block it. A future version will use per-device enrollment credentials, TLS, an integrated roster, and native Windows/macOS installers. Do not use this proof of concept to manage real students without additional security work.

## M3: Windows student auto-start prototype

See [windows/README.md](windows/README.md). This adds per-user startup after sign-in, **not** an EXE installer or Windows service. The M2 dashboard still does not show live LAN devices; this integration remains future work.
