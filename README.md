# FBS Classroom

Local-network classroom management software for separate Windows and macOS labs, targeting up to 40 student endpoints per lab.

## Status
M184 adds a separate [lab setup kit](docs/M184-DOWNLOADS-AR.md) for existing M183 installers: export a private profile locally on the teacher, import under each student account, then approve the device from the teacher. The public kit has no real lab secrets. Windows DPAPI checks (39) and Mac Intel and Apple Silicon Keychain checks (41 on each), including an independent consumer without authentication UI, passed. The Mac helper is Universal; independent execution passed on both architectures. [Results and limits](docs/M184-RESULTS-AR.md).

M183 reorganizes the teacher console and native Windows/macOS student dashboard around the supplied blue/navy Arabic reference. It includes the left sidebar, lab header, five-column device grid, seven-action screen dock, large broadcast preview, lab/group cards and compact student connection card. The operational teacher console is shared browser UI; native setup remains separate. OS window chrome, fonts and DPI can differ. [UI review images](docs/M183-UI-AR.md) use labeled fixture data, not real students.

All 1513 JavaScript tests and Chromium functional/visual acceptance passed. [Final Windows CI](https://github.com/F0500322988/FBS/actions/runs/42029666946) passed ten .NET projects (231 checks), both installer executions, 588 installed payload hashes, bundled Node, uninstall and unknown-file preservation. These are isolated CI checks, not full physical lab acceptance.

M182 automatic full-screen teacher broadcast and managed power/wake remain available. Student capture and desktop input retain their separate consent requirements. Wake packets do not prove power-on; Mac startup from complete shutdown is hardware-dependent and not guaranteed. See [M183 guide](M183-START-HERE.md), [Arabic results](docs/M183-RESULTS-AR.md) and [device test instructions](diagnostics/M183-DEVICE-TESTS-AR.md).

[Download both roles for Windows and Mac](docs/M183-DOWNLOADS-AR.md). Mac Universal packages passed Intel and Apple Silicon builds, isolated install/remove, PKG/DMG and runtime checks; downloaded packages were checked again by SHA256.

Windows previews are unsigned; Mac requires macOS13+ and uses ad-hoc signing without Developer ID or notarization. Updated physical lab GUI, permissions, actual power/wake and target-scale performance acceptance remain pending. This is a development preview.

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
