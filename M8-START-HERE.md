# FBS Classroom M8 — Teacher console authentication

## New functionality
- Teacher console password gate and HttpOnly SameSite=Strict session cookie (8-hour expiry).
- Protected `/api/status` and `/api/frames` so LAN students' device data and screenshots require teacher login.
- `POST /api/logout` to revoke the current browser session.
- Teacher UI prompts for a password when configured.

## Run teacher (PowerShell)
Set your existing `FBS_PAIRING_KEY`, `FBS_TLS_CERT`, `FBS_TLS_KEY` exactly as in M7.
Also set:
`$env:FBS_TEACHER_PASSWORD = Read-Host "New teacher password"`
Use a strong, unique password of at least 12 characters.
Run `node server.js` and open `http://127.0.0.1:4177` on the teacher PC.

## Limitations / security
- Teacher UI is only on loopback HTTP; do not expose it over the network.
- The password is passed through an environment variable, not yet integrated with Windows Credential Manager.
- This is an interim password/session layer; per-device enrollment, revocation, audit logging and input control are NOT implemented.
- No native remote mouse/keyboard control in M8. Do not deploy as a production remote-control system.
- Update and test on one teacher and one student device first.
