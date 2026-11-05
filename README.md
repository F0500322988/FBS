# FBS Classroom

Local-network classroom management software for separate Windows and macOS labs, targeting up to 40 student endpoints per lab.

## Status
M181 adds consented desktop commands: left/right/double click, scrolling, a complete relative drag with release, navigation keys, Enter and named Ctrl/Command/Shift/Alt shortcuts. OS account locking is a separate locally confirmed request, using Windows LockWorkStation or the macOS Lock Screen shortcut; request submission is not proof of completed locking. Remote unlock and secure login desktop control are unavailable. See [M181 usage](M181-START-HERE.md), [the Arabic results](docs/M181-RESULTS-AR.md) and [actual-device instructions](diagnostics/M181-DEVICE-TESTS-AR.md).

The Arabic console now has compact spacing, a graduation-cap logo, direct action navigation and a desktop preview beside its controls. Layout and controls passed Chromium acceptance, including mobile overflow checks. The screenshot uses an automated test fixture, not the user's computers. Pixel-exact equivalence with the original concept is not claimed.

All 1502 JavaScript tests passed. Windows CI [41987165867](https://github.com/F0500322988/FBS/actions/runs/41987165867) passed 198 .NET checks, including 25 checks using real input in an owned fixture window, installer execution, hashing of 584 installed files, bundled Node execution, uninstall and unknown-file preservation. The PowerShell device collector parsed successfully. TLS transport and owned-window input are independently verified; a complete network-to-native user session remains untested.

Mac Universal build, PKG/DMG verification, isolated installation/removal and local runtime checks passed on [Intel](https://github.com/F0500322988/FBS/actions/runs/41987727361) and [Apple Silicon](https://github.com/F0500322988/FBS/actions/runs/41986698311). [Download the final Intel-built Universal packages](https://github.com/F0500322988/FBS/releases/tag/m181-macos-preview-34-1). Ad-hoc signatures are used; Developer ID/notarization, actual CGEvent input after Accessibility approval, Keychain GUI and screen-recording permission flows are not verified on user devices. Earlier packaging failures and fixes are recorded in the Arabic results.

The user has Windows and Mac available, but neither is directly connected to this conversation and no actual-device reports have been received. The passive test package does not collect credentials or automatically lock accounts. Physical cross-device LAN, account lock/unlock and 40-device acceptance remain pending. Windows is unsigned. This is a development preview, not a fully validated final release. Older milestone notes and preview-only readiness tools are historical; the legacy /control pipeline stays disabled while /assist v2 provides the new explicitly consented capabilities.

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
