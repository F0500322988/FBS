# FBS Classroom M21 — Local consent authentication (development)

The Windows student UI generates a fresh 256-bit token at startup and passes it
only to its child agent process through an environment variable. The UI adds
`X-FBS-Local-Token` to requests to `http://127.0.0.1:4190/control/local`.
The agent rejects unauthenticated requests and requests with an Origin header.

This is **not** a complete security boundary against malicious programs running
as the same Windows user, or against processes with sufficient privileges to
inspect process environments. The token is not saved on disk. Other loopback
endpoints (screen-sharing page and frame upload) are intentionally unchanged.

## Validation
- `node --test` (includes the new authentication unit test)
- Windows compilation and lab tests have NOT been performed here.
- Run `windows/Build-Installers.ps1` on a Windows 11 build machine with
  .NET 8 SDK, Node.js and Inno Setup 6.
- Confirm the student UI shows a pending session, and that unauthenticated
  requests to `/control/local` receive HTTP 403.

## Not yet implemented
Real keyboard/mouse input, production device hardening, complete session
revocation, or a validated production installer.
