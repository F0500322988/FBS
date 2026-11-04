# FBS Classroom — M160: Teacher identity audit status

This phase adds an **identity-only**, opt-in status display to the teacher pairing audit window. Each completed pairing attempt increments a thread-safe accepted/rejected counter and adds a timestamped, bounded (40 entries) Arabic status row. No student device ID, network address, cryptographic key, or signature is stored in the UI history. A successful proof **does not authorize a control session**.

## Windows 11 commands

From the `FBS-Classroom` directory:

```powershell
node --test tests/m160-teacher-identity-status.test.js
node --test
dotnet build .\windows\FBS.Teacher.Launcher\FBS.Teacher.Launcher.csproj
```

Open teacher > administrator audit > TLS pairing test, configure a trusted PFX and secure administrator directory, and explicitly start the listener. Start the student identity test. Watch accepted/rejected counters. Close/stop listener when done.

## Limits

The counters are per listener run and not persisted. The UI shows completed identity attempts, **not currently connected devices**: the server deliberately closes connections after each proof. No live roster, remote keyboard/mouse control, or installer was added. JavaScript tests inspect source; Windows .NET compilation and two-PC tests must be performed on Windows 11. Certificate and firewall setup remain administrator responsibilities.
