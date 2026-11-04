# FBS Classroom M159 — Windows 11 two-computer LAN readiness

Read-only diagnostics. **No firewall modifications, no device enrollment, no remote-control commands.**

1. On the teacher PC, open the M156 pairing-audit window, choose the actual LAN interface IP, and start its TLS listener on port 47443. The PFX certificate must be secured and the student must have its verified SHA-256 fingerprint from a trusted channel.
2. On the teacher PC, run: `powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M159-Lan-Readiness.ps1 -Role Teacher -TeacherHost 192.168.1.10 -Port 47443` (replace address). The Listener check is required. FirewallInfo is informational and does not guarantee access.
3. On the student PC, run: `powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M159-Lan-Readiness.ps1 -Role Student -TeacherHost 192.168.1.10 -Port 47443 -RequireTls -ExpectedCertificateSha256 <64-hex-digits>`.
4. Then run the M157 student identity-test UI using the *same* address, port and verified fingerprint. The device must already be enrolled in the teacher registry.
5. If TCP fails, inspect switch VLAN routing, endpoint addresses and Windows Firewall inbound rules. Do not disable the firewall. If TLS fails, check certificate hostname and pin, and whether the listener is still running. If identity fails after TLS succeeds, inspect enrollment and device key binding.

**Security limitation:** The M159 diagnostic TLS check authenticates the certificate by pinned SHA-256 fingerprint. It does not establish the device identity or grant control. It is intentionally opt-in, and never stores the fingerprint. A TLS server may close the connection after this diagnostic handshake because no pairing messages follow.

**Validation:** `node --test tests/m159-lan-readiness.test.js` and `node --test`. PowerShell/.NET must be exercised on real Windows 11 hosts; JavaScript source tests are not a substitute for that.
