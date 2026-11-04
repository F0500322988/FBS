# FBS Classroom M18 — Signed student messages and pinned enrollment keys

- The Node student agent signs heartbeat and JPEG-frame messages with its persisted Ed25519 key.
- The teacher TLS endpoint verifies signatures, timestamps, and a short-lived replay cache.
- When the teacher approves a discovered student, the student public key is pinned in enrollment.json.
- Frames are accepted only from an approved key; revoking approval removes the key.

## Security and deployment limitations
This is an integration prototype, **not** a fully hardened deployment. The shared pairing key remains required. Unapproved student heartbeat entries are visible as pending. A hostile client knowing the shared pairing key could still create pending entries. Existing enrollment files without pinned keys must be re-approved to enable screen frames. The Node private key is stored in a local file rather than Windows CNG; protect the OS account and filesystem. No native Windows screen capture or remote keyboard/mouse control is implemented.

Run `node --test` before testing on a single isolated lab PC. The teacher must be started with a TLS certificate, teacher password, and pairing key as documented in previous releases. Do not distribute to 21 devices before an actual Windows lab test.
