# FBS Classroom M162 — Opt-in periodic identity proof and freshness roster

This stage provides a practical, *explicitly enabled* presence approximation, **not** a persistent TLS session. The student can opt into a fresh RSA/TLS proof every 10 seconds. The teacher roster marks a device as "recently verified" if a successful proof arrived within 30 seconds, and otherwise shows "offline/no recent proof". Each connection closes after authentication and carries no remote commands. No network activity starts automatically.

## Windows 11 tests

From the extracted `FBS-Classroom` directory:

```powershell
node --test tests/m162-presence-polling.test.js
node --test
dotnet build .\windows\FBS.Teacher.Launcher\FBS.Teacher.Launcher.csproj
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
```

Start the teacher TLS identity-audit listener from the teacher UI with the existing registered device roster and PFX certificate. On the student UI, supply the trusted teacher hostname, port, and certificate fingerprint. Check the opt-in Arabic periodic verification checkbox and click the identity test button. Stop it with the student stop button or by closing the dialog. The teacher roster should show recent proof while successful checks continue and expire about 30 seconds after the last success.

## Limits and security

- No persistent authenticated TLS channel, no automatic reconnect, no input control, and no installer EXE were added.
- A recently verified proof is not proof of ongoing connectivity, and a failure is not proof the computer is powered off.
- Authentication attempts stop after a rejected proof; network exceptions stop the test and are displayed without secrets.
- The teacher UI does not log private keys, signatures, or passwords.
- JS tests are structural. Actual .NET builds, Windows 11 tests, and two-PC LAN tests must be performed on Windows.
