# M99 — Post-install runtime smoke test (Windows 11)

This phase runs only bundled `Runtime/node.exe --version` and `Runtime/node.exe --check <role entry>` on the local machine. It does NOT start the teacher GUI, student agent, network listener, or screen capture. This is intentional: launching the actual teacher EXE opens an interactive dialog and browser and may leave a running service if automated incorrectly.

From PowerShell in the extracted FBS-Classroom folder, on the installed machine:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\M99-Runtime-Smoke.ps1 -Role Student -Report .\m99-student.json
node .\windows\M99-Verify-Report.js .\m99-student.json
```

For Teacher replace `Student` with `Teacher`. If the installation is elsewhere, add `-InstallDirectory 'C:\actual\installation\folder'` (root containing `Runtime` and role directory).

`passed: true` verifies only the local bundled Node executable and entrypoint syntax. To prove full application startup, manually launch the role EXE on a test Windows machine and verify the interface, logs, network, and student consent/stop behavior. Keep remote mouse/keyboard control disabled.

No Windows native EXE was built or executed in the authoring environment. The source ZIP is not a prebuilt installer.
