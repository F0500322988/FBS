# FBS Classroom

Local-network classroom management software for separate Windows and macOS labs, targeting up to 40 student endpoints per lab.

## Status
M182 addresses the physical Mac lab feedback from M179: teacher broadcasts now open automatically on the student in a borderless full-screen viewer, without per-session accept/reject controls. The teacher ends the broadcast; stale or unavailable frames release the display. Mac displays the broadcast on its connected screens; Windows uses its primary screen. Normal OS shortcuts and process termination remain available. Student screen capture and desktop input retain their separate consent requirements.

The teacher's power page sends confirmed sleep, restart and shutdown requests to approved online M182 clients. Saved, approved Ethernet addresses support Wake-on-LAN while devices are offline. A sent packet does not prove power-on; Mac startup from complete shutdown depends on hardware and is not guaranteed, especially on Apple Silicon. Mac System Events may need Automation approval during local administrator setup. App shutdown is not forced through unsaved documents. See [M182 usage](M182-START-HERE.md), [Arabic results](docs/M182-RESULTS-AR.md) and [the lab test guide](diagnostics/M182-DEVICE-TESTS-AR.md).

All 1512 JavaScript tests and Chromium acceptance passed. Windows CI [42016890437](https://github.com/F0500322988/FBS/actions/runs/42016890437) passed 222 .NET checks, including 11 managed-viewer checks and 13 power-policy checks, both installer executions, hashing of 586 installed files, bundled Node execution, uninstall/unknown-file preservation and collector syntax checks. The viewer fixture displays without a student click and exits on teacher stop or stale frames. No actual shutdown, restart, suspend or hardware wake is claimed from CI.

Mac Universal build, PKG/DMG payload verification, isolated installation/removal and loopback runtime checks passed on [Intel](https://github.com/F0500322988/FBS/actions/runs/41990809762) and [Apple Silicon](https://github.com/F0500322988/FBS/actions/runs/41990812443). [Download the Universal Mac/iMac packages](https://github.com/F0500322988/FBS/releases/tag/m182-macos-preview-37-1). Their 40 shared JavaScript/public files were checked against the current source. Mac GUI, TCC permission flows and real power/wake behavior on the user's updated lab devices remain untested until the user runs M182.

Windows installers are unsigned; Mac uses ad-hoc signatures without Developer ID/notarization. This is a development preview. The user tested an earlier M179 Mac build and supplied the feedback; that is not proof the M182 changes passed physical lab acceptance. The legacy /control pipeline remains disabled; /assist v2 implements explicitly consented input, while the new managed broadcast and /power pipeline implement the requested lab operations. Older milestone notes are historical. Main was not modified.

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
