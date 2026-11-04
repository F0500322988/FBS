# M145 — Windows administrator credential vault

This stage adds `WindowsAdminCredentialVault.cs`, a Windows-only DPAPI CurrentUser
credential vault for the admin password verifier and independently generated
32-byte registry/lockout keys. It is **not wired into app startup**: the app
still keeps enrollment UI hidden and input injection disabled. Provisioning
must be done deliberately by a trusted administrator under the same Windows
account that later opens the vault. Do not copy the vault to student devices.

**Important limits:** Windows DPAPI protects at rest only under the Windows
user context. It does not provide remote administrator authentication, protect
against compromise of that account, or prevent rollback of older encrypted
files. The caller must enforce secure NTFS ACLs, backup and key recovery policy,
atomic provisioning, and lifecycle/rotation. Do not use this vault for production
until those are implemented and reviewed.

Run: `node --test tests/m145-windows-admin-vault.test.js` and `node --test`.
On Windows 11 with .NET 8 SDK, run:
`dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj`.
If the build reports a missing ProtectedData reference, install the supported
`System.Security.Cryptography.ProtectedData` package for your .NET environment
before proceeding; do not bypass encryption.
