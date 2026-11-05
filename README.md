# FBS Classroom

Local-network classroom management software for separate Windows and macOS labs, targeting up to 40 student endpoints per lab.

## Status
M180 adds locally consented limited assistance for one manually pinned student: relative pointer movement and plain Unicode text only. No clicks, shortcuts or Enter. It requires current full-monitor sharing, a visible stop indicator and fresh consent; it expires within two minutes. See [the Arabic guide](docs/M180-ASSISTANCE-AR.md) and [M180-START-HERE.md](M180-START-HERE.md).

All 1499 JavaScript tests and Chromium acceptance passed. A preceding run timed out in one M173 messaging check during NSIS compression; an unchanged retry passed, and the original cause remains unconfirmed. Windows CI [41983722170](https://github.com/F0500322988/FBS/actions/runs/41983722170) passed 185 .NET checks, including owned-window OS input, both installer executions, hashing of 584 installed files, bundled Node execution, uninstall and preservation of an unknown file. These checks do not prove a complete network-to-student-desktop session.

Mac Universal packages passed native build, payload verification, isolated installation/removal and local runtime checks on both Intel and Apple Silicon hosted runners. [Download the current Universal packages](https://github.com/F0500322988/FBS/releases/tag/m180-macos-preview-22-1). Actual Mac Accessibility permission and CGEvent input emission, Keychain GUI and screen-recording permission flows remain untested.

Windows installers are unsigned; Mac uses ad-hoc signatures without Developer ID/notarization. Full remote control, OS account locking, final visual matching and physical mixed-device/40-device acceptance remain incomplete. The screen pause is an overlay, not an OS account lock. Lab presets do not isolate network keys or enrollment. Older milestone notes are historical.

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
