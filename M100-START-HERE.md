# M100 — Live startup observation on Windows 11

This stage **does not automatically launch or control** either app. It observes the exact installed EXE process over 10 seconds and records explicit operator attestations about the visible UI and role behavior. It cannot independently certify network connectivity, TLS, consent, screen sharing, or service health.

1. Install the M76-built role package on a test Windows 11 machine. Manually launch `FBS.Teacher.exe` (Teacher) or `FBS.Student.Native.exe` (Student) from the installation folder. Inspect the UI and intended role behavior. Keep remote mouse/keyboard control disabled.
2. In PowerShell at the extracted project root, run (only after actually verifying both assertions):

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\M100-Live-Startup.ps1 -Role Teacher -ConfirmedVisibleUI -ConfirmedExpectedBehavior -Report .\m100-teacher.json
node .\windows\M100-Verify-Report.js .\m100-teacher.json
```

For Student, replace `Teacher` with `Student` and change the report name. To target a nondefault installation, add `-InstallDirectory 'C:\actual\installed\root'` (the folder containing `Teacher`/`Student` and `Runtime`). To change the observation duration, add `-ObserveSeconds 15` (2–60 seconds).

A report passes only if the correct EXE exists, its process is observed at both ends, and the operator explicitly confirms the visible UI and expected role behavior. The process may still be unhealthy even if it stays alive. For network and consent, repeat the M82–M92 field tests.

No native Windows EXE was built or run in the authoring environment. This ZIP is the complete source, not a ready-to-install EXE. macOS is not complete.
