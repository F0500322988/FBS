# FBS Classroom

Local-network classroom management software for separate Windows and macOS labs, targeting up to 40 student endpoints per lab.

## Status
M177 adds persistent lab names and device groups, revision checks for concurrent browser edits, atomic file replacement and group filters for the roster, screen viewer and message/file/broadcast recipients. Groups organize device IDs and never grant enrollment or remote input permissions. See [M177-START-HERE.md](M177-START-HERE.md).

All 1471 JavaScript tests passed on Linux, along with Chromium acceptance for lab editing, group filtering, failure recovery and previous message/file/broadcast features. Windows CI [41860885504](https://github.com/F0500322988/FBS/actions/runs/41860885504) passed the new persistence/API restart tests and 148 .NET checks. The POSIX symlink test was explicitly skipped on Windows. Both Windows x64 installers were built and 91 extracted payload files were hash verified; interactive installer and GUI acceptance remain untested.

Mac M177 Intel packaging and additional Apple Silicon validation are tracked in the milestone evidence. Earlier [M176 Mac packages](https://github.com/F0500322988/FBS/releases/tag/m176-macos-preview-7-1) remain available until M177 publication is confirmed. Windows installers are unsigned; Mac apps use ad-hoc signing without Developer ID or notarization. Physical mixed-device LAN and GUI acceptance remain outstanding.

Remote input, locking, multiple independent lab profiles and full visual matching remain incomplete. One lab profile and its groups now persist per teacher account. Older milestone notes are historical.

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
