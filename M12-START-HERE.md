# FBS Classroom M12 — Teacher approval and revocation (developer preview)

This version introduces a **teacher-managed allowlist** for the IDs reported by the existing Node.js student agents. New devices can appear in the pending roster, but their screenshots are **not** served to the teacher browser until explicitly approved. Revocation hides frames and invalidates pending control requests. Approvals persist in `data/enrollment.json` (or `FBS_ENROLLMENT_FILE`).

## Use
Run teacher with M11/M8 password, pairing key and TLS settings. Sign in to the teacher dashboard on `http://127.0.0.1:4177`.
Use the enrollment API from the teacher PC, with the browser session cookie:
- `GET /api/enrollment/devices` — discovered devices and approval status
- `POST /api/enrollment/approve` JSON `{ "deviceId": "PC-01" }`
- `POST /api/enrollment/revoke` JSON `{ "deviceId": "PC-01" }`

A simple approval panel is not yet part of the graphical UI; use a local REST client with the authenticated session cookie. Protect the enrollment JSON and back it up.

## Important limitations
**This is not cryptographic per-device enrollment.** The existing agent reports a mutable hostname-style ID and uses a shared lab key. The Windows CNG identity created in M11 is **not yet transmitted or verified** by this protocol. Another client with the shared key could impersonate an approved ID. Do not rely on this allowlist for secure remote control.
Remote mouse/keyboard input is not implemented. Next: proof-of-possession with CNG keys, signed challenges, teacher approval binding to public key, key rotation and revocation. Test M12 on one student PC before rolling out.
