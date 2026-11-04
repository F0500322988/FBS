# FBS Classroom M19 — Authenticated control-session handshake foundation

## Implemented
- Teacher-issued, random, short-lived session IDs and replay-resistant one-time acknowledgement.
- Teacher LAN endpoints `/control/poll` and `/control/ack` require the same signed Ed25519 packet, device enrollment and recent matching IP as heartbeat/frame messages.
- Session expiration, cancel, revoke and audit history.
- Explicit `inputEnabled:false` in all responses. No keyboard or mouse injection.

## Not implemented
- Student-side polling and a **native consent UI**; the native Windows agent does not yet accept or acknowledge control sessions.
- Real input transmission, mouse or keyboard injection, elevation, unattended control, production-grade replay-cache persistence, macOS agent.
- Windows EXE compilation and lab testing. This release is source code, not an installer.

## Test
`node --test`

## Next phase
Implement the native student-side consent indicator and signed acknowledgement, then separately implement input control with explicit authorization and a visible kill switch.
