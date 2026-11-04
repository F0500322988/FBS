# FBS Classroom M83 — Authenticated LAN discovery

This release adds a **passive** UDP listener on student Windows computers. It checks HMAC-authenticated announcements from the existing teacher LAN server (UDP port 4181) and optionally matches the expected TLS certificate SHA-256 fingerprint. It does not enroll students, access screens, or enable remote input.

1. Start the teacher server with its TLS certificate and the lab pairing key configured.
2. On a student computer on the same LAN, set `FBS_PAIRING_KEY` securely to the lab key (do not paste it into logs or reports).
3. From the project directory run:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M83-Discovery.ps1 -ExpectedCertSha256 YOUR_64_HEX_FINGERPRINT
```

The output `m83-discovery.json` reports discovered teacher IP, TLS fingerprint and port, not the pairing key. If the probe times out, check Windows Firewall inbound UDP 4181, switch VLAN and broadcast reachability. For a classroom of 21 to 40 devices, run this on several student PCs. **A passed discovery check does not establish student enrollment or teacher UI visibility.**

Tests: `node --test`.
