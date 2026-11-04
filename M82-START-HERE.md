# FBS Classroom M82 — LAN first connection readiness

M82 adds a **non-invasive** TLS connection test from the student PC to the teacher PC. It validates a SHA-256 pin of the actual teacher TLS certificate. It does **not** enroll a device, capture a screen, test UDP discovery, or enable remote input.

## Student Windows 11

First launch the teacher LAN service using the existing configuration and confirm that TCP port 4180 is listening. Obtain the teacher certificate's SHA-256 fingerprint from a trusted administrator (not from an unauthenticated network response). On the student computer, run from the project root:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M82-Lan.ps1 -TeacherIP 192.168.1.10 -ExpectedCertSha256 YOUR_64_HEX_FINGERPRINT
```

The command writes `m82-student-lan.json`. `passed: true` means **only** that the TLS socket connected, its presented certificate matched the pinned SHA-256, and the certificate was not expired. It does not mean automatic discovery, sharing or control works. If `ECONNREFUSED`, check that the teacher service is running and firewall permits TCP 4180. UDP discovery uses port 4181 and must be checked separately in the field. For troubleshooting, avoid sending passwords, pairing keys or private certificates.

Run `node --test` for local automated tests. No native C# or Windows execution is performed by these tests. Real keyboard and mouse injection remains disabled.
