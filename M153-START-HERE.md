# M153 — Pinned LAN TLS channel (transport foundation)

Adds `windows/FBS.Student.Native/PinnedLanTlsChannel.cs`, an **outbound-only**
TLS client transport with a pre-approved SHA-256 certificate fingerprint, DNS
hostname verification, bounded length-prefixed frames and a 10-second connection
handshake deadline. No listener or enrollment handshake is wired up.

## Run tests

```powershell
node --test tests/m153-pinned-lan-tls-channel.test.js
node --test
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
```

## Integration requirements

1. Provision the teacher/server TLS certificate using an authenticated administrator
   workflow and pin its SHA-256 fingerprint on each student through a protected channel.
2. Build a teacher-side TLS listener with explicit binding and firewall policy.
3. Implement fresh one-use RSA challenge/response over the **same TLS channel**;
   verify the approved device key and bind proof to session context.
4. Apply enrollment authorization, consent/visible student status, stop-button,
   timeouts, replay prevention and revocation before enabling any commands.
5. Add actual Windows runtime integration tests, including wrong pin, wrong host,
   stale nonce, oversized frames, cancellation and disconnect handling.

## Limitations

This is a reusable transport building block, **not a working LAN pairing feature**.
No student-to-teacher connection is made by default, no teacher listener is present,
no mouse/keyboard control is enabled and no EXE installers are produced.
Node tests inspect source only. The project has not been built with .NET in this
Linux environment; validate the C# build and behavior on Windows 11.
