# FBS Classroom M14 — Cryptographic identity proof prototype

## Implemented
- `device-identity.js`: generates an Ed25519 key pair on first use, persists it per OS user.
- Signs a timestamped message with a 128-bit nonce.
- Verifies the signature, time window and replay nonce.
- Tests for persistence, tampering, stale requests and replay.

## Important boundaries
This is a **standalone prototype**, not integrated with teacher LAN heartbeat,
screen frames, enrollment approval, or Windows CNG from M11. The private key is
saved in a local JSON file, not Windows hardware-backed storage. It should not be
treated as a deployed identity security feature. Existing enrollment still
uses a shared key and device identifier.

Before integration: store private keys with Windows CNG/DPAPI or an equivalent
protected keystore, bind the public key to an administrator-approved device
record, verify signed heartbeat and frame messages server-side, persist a
bounded replay cache, and add revocation and key rotation. Test on one PC first.
Remote mouse/keyboard control is NOT implemented.

## Run tests
`node --test`
