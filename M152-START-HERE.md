# FBS Classroom — M152: LAN pairing proof foundation

This phase adds a **standalone cryptographic pairing proof primitive** (`EnrollmentPairingProof.cs`) to the Windows student project. It signs a fresh 32-byte challenge bound to an ASCII device ID and protocol domain using RSA-PSS/SHA-256, and verifies the signature against a **previously administrator-approved** RSA public key. The verifier does not approve keys itself.

**Not yet implemented:** a LAN transport, mutual TLS, key delivery, enrollment synchronization, student-side trust store, replay cache, session authentication, mouse/keyboard injection, or an EXE installer. A cryptographically valid proof alone must never grant control or registration. The caller must issue unique fresh nonces, enforce expiry and one-time use, validate approved keys and bind the result to a secure authenticated channel before using it in a future network protocol.

## Windows 11 validation

```powershell
node --test tests/m152-enrollment-pairing-proof.test.js
node --test
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
```

JavaScript tests are source-structure checks, not runtime cryptographic interoperability tests. Run .NET tests on Windows before deployment. Keep the native input adapter disabled until verified end-to-end authorization and explicit student-visible consent.
