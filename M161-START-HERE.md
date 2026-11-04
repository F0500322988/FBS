# M161 — Teacher registered-device roster

The teacher TLS identity audit window now displays enrolled and revoked device identifiers from the encrypted administrator registry. Accepted identity proofs update a **session-only last verified** timestamp; this is **not an online/presence indicator**. A refresh button reads the currently loaded registry snapshot. No public keys, credentials, or signatures appear in the table.

## Test on Windows 11

```powershell
node --test tests/m161-teacher-roster.test.js
dotnet build .\windows\FBS.Teacher.Launcher\FBS.Teacher.Launcher.csproj
```

Open Teacher > local admin audit > TLS identity audit. Select the protected admin directory and start the identity-only listener. The table is populated after registry load. Run student identity proof to update last-verified timestamps.

Limitations: The roster reflects a registry snapshot loaded when the listener starts. If enrollment changes in another process, stop/restart the listener to reload it. Verification results are not durable, and no live sessions, input control, or Windows installers are provided. This Linux environment cannot validate a Windows .NET build.
