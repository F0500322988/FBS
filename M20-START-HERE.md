# M20 — Windows student consent UI (prototype)

The student agent polls the teacher’s existing TLS-pinned `/control/poll` endpoint every 2 seconds using signed identity messages. The C# Windows Forms app polls the loopback agent `/control/local` endpoint and shows Approve / Decline buttons for a pending session. The agent forwards the decision to `/control/ack`. Input injection remains **disabled**.

## Important limitations
- Loopback consent endpoint has no per-process authentication; other programs running on the same PC may reach it. **Do not use this as a production authorization control.**
- Native C# app has not been compiled or tested on Windows in this environment.
- The teacher still requires TLS certificate, pairing key, teacher password and device enrollment.
- Approval is only a session acknowledgment; it does not grant mouse or keyboard access.
- On Windows, run `node --test` and build with `windows/Build-Installers.ps1` after installing the documented prerequisites.
