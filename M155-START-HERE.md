# FBS Classroom M155 — Opt-in LAN identity pairing audit

## New files
- `windows/FBS.Student.Native/PinnedLanPairingClient.cs`: outgoing certificate-pinned TLS client and proof of device private-key possession.
- `windows/FBS.Teacher.Launcher/TeacherPinnedTlsListener.cs`: new `RunPairingAuditAsync` method for server-side identity-only handshake using the encrypted allowlist (`PersistentManagedEnrollment`).
- `tests/m155-lan-pairing-audit.test.js`: source-structure regression checks.

## Protocol
1. Teacher administrator explicitly configures a specific LAN bind IP, port, TLS certificate/private key and **existing**, protected persistent enrollment registry.
2. Student administrator configures DNS host, TLS server certificate SHA-256 pin, approved device ID and its own RSA private key.
3. Student opens TLS with certificate pinning, sends ASCII device ID in a length-prefixed frame.
4. Teacher checks enrollment and issues a fresh 32-byte single-use challenge, expiring in 30 seconds.
5. Student signs the challenge with RSA-PSS SHA-256 and sends the signature.
6. Teacher checks proof against the approved public key and sends `OK` if valid. Both sides close the connection. No commands are accepted.

**Not wired into normal UI startup**: This is an opt-in API and cannot be used by clicking a teacher/student UI button yet. No private key distribution, certificate provisioning, DNS setup, firewall changes or network listener is automatically performed. No classroom remote control is enabled.

## Windows build
```powershell
node --test tests/m155-lan-pairing-audit.test.js
node --test
dotnet build .\windows\FBS.Teacher.Launcher\FBS.Teacher.Launcher.csproj
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
```

## Security limitations
- The identity response proves possession of a registered device key; it is **not** student permission or a classroom-control authorization.
- A shared registry challenge slot per device means concurrent connections using the same ID may invalidate each other, failing closed.
- Proofs are single-use only in the **current teacher process**; restarts lose pending challenges. The channel closes immediately after a proof.
- The TLS pin is configured externally and must be authenticated out-of-band. A certificate change requires deliberate pin update.
- The C# projects were not built or run in this Linux environment; JavaScript tests check source structure, not live TLS interoperability.
