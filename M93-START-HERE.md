# FBS Classroom M93 — Lab Readiness Summary

M93 combines **existing** audit JSON reports into one sanitized, offline deployment-readiness summary. It does not connect to the network or operate student screens. All reports should be gathered during the same supervised lab trial; old reports are not automatically rejected.

## Windows 11 / PowerShell

From the FBS-Classroom folder, first run M84, M91 and M92 on the same number of student devices (21 or 40), following their respective START-HERE files. Example for 21:

```powershell
$env:FBS_TEACHER_PASSWORD = Read-Host "Teacher password"
node .\windows\M84-Enrollment-Visibility.js 21 m84-report.json
node .\windows\M91-Concurrent-Preview-Load.js 21 m91-report.json 5 2000
node .\windows\M92-Preview-Performance.js 21 m92-report.json 6 2000
node .\windows\M93-Lab-Readiness.js 21 m93-readiness.json --m84 m84-report.json --m91 m91-report.json --m92 m92-report.json
```

Optional evidence can be added using `--m82 file.json`, `--m83 file.json`, and `--m85` through `--m90` as available. A supplied optional failed report makes the combined result fail. The result is `passed: true` only when the required reports are valid, successful, and consistent with the expected capacity. Reports do not contain student screenshots or credentials; keep the originals private because some older stage reports may contain device metadata.

**Limits:** This is an evidence aggregator, not a new live test. It does not authenticate input files, prove that they are recent, verify consent on students' screens, measure actual network bandwidth, or certify installer packages. Remote keyboard/mouse input remains disabled. Windows EXE/installer builds and macOS installers require platform-specific build and field testing.
