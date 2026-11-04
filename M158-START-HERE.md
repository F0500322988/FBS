# FBS Classroom — M158 LAN protocol integration test

This stage adds an **executable .NET loopback integration test** instead of only static checks.
It also aligns the student test window's default port (47443) with the teacher test window.

## On Windows 11 with .NET 8 SDK

From the `FBS-Classroom` directory:

```powershell
node --test tests/m158-lan-integration.test.js
dotnet run --project .\windows\FBS.Pairing.Integration\FBS.Pairing.Integration.csproj
node --test
```

The .NET test creates a temporary encrypted registry, RSA keys, and a self-signed localhost TLS certificate; runs the actual teacher listener and student client over 127.0.0.1; checks approved key acceptance, incorrect key rejection, unknown ID rejection, and invalid certificate fingerprint rejection; and deletes temporary test files. It does **not** open LAN ports beyond loopback or enable remote input. It may fail if another process races to reserve its ephemeral port.

## Actual two-PC test (manual)

The teacher must have a properly provisioned administrator directory, enrolled student's public key, and a PFX certificate with DNS SAN matching the host the student enters. Transfer the SHA-256 certificate fingerprint out of band and confirm it on the student. Start the identity-only listener in the teacher app; on the student app, open the manual pairing test and enter the teacher's DNS host, port 47443, and fingerprint. Ensure the firewall allows the chosen port only on the trusted lab network. The loopback test does not establish that a real two-PC LAN connection succeeds.

## Limitations

No Windows/.NET SDK was available in the authoring environment, so the executable test was **written but not run here**. The Node tests are static/source-level tests, not substitutes for .NET runtime integration tests. No input control, screen streaming, installer, or persistent authenticated classroom session is enabled.
