# M135 — Managed device registry primitive

Added `ManagedDeviceRegistry.cs`: an in-memory public-key allowlist (up to 40 devices), admin-gated provisioning and revocation, short-lived single-use challenges, and RSA-PSS proof verification.

**Important:** The administratorAuthenticated boolean is a caller-supplied placeholder, not verified authentication. This component is NOT connected to the student command execution path, and it is NOT a durable trusted enrollment database. It does not authorize remote control. No mouse/keyboard injection is enabled.

On Windows 11 with .NET 8 SDK:

```powershell
node --test tests/m135-managed-device-registry.test.js
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M129-Native-Safety.ps1
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
```

Next: authenticated administrator provisioning, durable tamper-resistant registry, authenticated transport and binding device proofs to actual session authorization.
