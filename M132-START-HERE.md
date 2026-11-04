# FBS Classroom M132 — persisted stop ledger runtime regression

This stage extends the actual Windows C# smoke test to compile and exercise `PersistentStopLedger` using an isolated temporary ledger file. It checks two stopped sessions survive new instances (simulated app restart), an additional stop survives a second restart, and corrupted ledger data fails closed. No real input is injected and no production student data is modified.

## Run on Windows 11

```powershell
node --test tests/m132-persistent-restart-smoke.test.js
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M132-Persistent-Restart.ps1
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
```

## Manual actual Windows reboot verification

On a dedicated test student PC, start a preview session and stop it locally. Reboot Windows and start the student app again, reconnect the teacher, and verify the old session is rejected. Start a **new** authorized session and verify the normal consent flow works. Do not delete or modify the real ledger to make a test pass. Note that the automated test simulates process restart; it does **not** reboot Windows or verify OS-level permissions, installer behavior, or tamper resistance.

## Limitations

- Native mouse/keyboard injection remains disabled.
- No EXE installer has been built in the Linux development environment.
- Local ledger files can be altered by a user with sufficient filesystem permissions; production protection requires additional device-management controls and server-side revocation.
