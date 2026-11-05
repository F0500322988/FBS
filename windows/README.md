# M3 Windows student auto-start (prototype)

Requires Node.js 20+ installed on the student computer. Unzip the project locally.
Run PowerShell in the extracted `FBS-Classroom` folder as the **same Windows user** who uses the computer:

```powershell
$key = Read-Host 'Shared lab pairing key (16+ characters)' -AsSecureString
.\windows\Install-Student.ps1 -PairingKey $key
```

The installer copies the student agent to `%LOCALAPPDATA%\FBSClassroom` and creates a shortcut in that user's Startup folder. The key is encrypted using Windows DPAPI for the current user. On subsequent sign-ins, the agent starts automatically. No admin rights required for per-user install. This is not a Windows Service or EXE installer. An agent does **not** start before user sign-in. No student-screen recording or remote control is implemented.

**Security limitations:** M2 discovery uses a shared lab key and HTTP heartbeats. This is an early prototype, not a production-ready secure deployment. Restrict use to an isolated trusted lab LAN; do not expose TCP 4180 or UDP 4181 to the internet. Do not reuse passwords as the pairing key. Future releases need per-device enrollment, TLS, and teacher authentication.

Uninstall startup: `.\windows\Uninstall-Student.ps1`. The student can see the application in Windows Startup Apps; a clear status UI is planned.
