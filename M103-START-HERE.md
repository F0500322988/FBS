# FBS Classroom M103 — Live device status monitor

Read-only polling of the teacher's authenticated **local loopback** `/api/status` endpoint. Reports counts of online/offline/unapproved devices and transitions (online → offline → online, etc.). Does **not** enable remote mouse/keyboard input, grant approval, or capture screens.

## Windows 11 (teacher PC)

1. Run the live teacher service, enroll/approve the test students, and confirm each student's screen-sharing consent separately if using previews.
2. In PowerShell at the `FBS-Classroom` source root:

```powershell
$env:FBS_TEACHER_PASSWORD = Read-Host 'Teacher password'
node .\windows\M103-Device-Status-Monitor.js 1 m103-one.json 6 2000
node .\windows\M103-Device-Status-Monitor.js 21 m103-lab.json 10 2000
```

Arguments: expected approved online students at end (1–40), report path, samples (2–120), interval in milliseconds (500–60000), optional teacher API port (default 4177).

3. To see transitions, disconnect and reconnect a **test** student while samples are being collected. Monitor may miss very short interruptions between polls. A `passed: true` report requires a healthy final count and safe server state; it does not require any disconnect/reconnect transition.
4. Review `samples`, `transitions`, and `issues` in JSON. Device names/IDs are **not** written; transition IDs are temporary HMAC pseudonyms, randomized each run. Do not distribute reports containing sensitive classroom observations without authorization.

The script does not alter network connections or student settings. If the server cannot be reached, it exits with an error; it does not write a success report. No actual Windows EXE is included in this source ZIP. Physical Windows tests and macOS packaging remain outstanding.
