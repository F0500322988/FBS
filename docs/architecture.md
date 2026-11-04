# Architecture v0.1

Two separate labs: Windows 10/11 and macOS. Each has one teacher console and up to 40 student agents, connected over LAN via a Catalyst 2960-X switch.

## Trust and safety
- Pair each agent with a teacher console using a visible enrollment code and an administrator approval step.
- Persist trusted public keys using platform-protected storage.
- Use mutually authenticated TLS for all control and media sessions.
- Show a persistent local indicator when a screen is viewed or controlled.
- Require explicit policy authorization for remote input, file transfer, and locking.
- Log teacher actions locally with timestamps and endpoint identifiers.

## Data/control plane
- Control: versioned messages for enroll, heartbeat, device state, requests, and acknowledgements.
- Media: separate rate-limited stream with adaptive resolution and frame rate.
- Avoid exposing listening ports beyond trusted lab subnet.

## Packaging
- Windows EXE via signed installer build on Windows CI.
- macOS PKG/DMG via macOS build host, codesigning and notarization when distributed externally.

## Known risks
macOS screen recording and accessibility permissions; Windows secure desktop restrictions; network bandwidth under 40 simultaneous streams; switch configuration and VLAN segmentation.
