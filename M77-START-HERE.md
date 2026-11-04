# FBS Classroom M77 — Windows install audit

M77 audits installed Teacher/Student files without launching software or enabling remote input.

1. Build and install the M76 installers on Windows 11 (use a test machine first).
2. From project root, run:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M77-Install.ps1 -Role Teacher -OutputReport .\m77-teacher.json
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M77-Install.ps1 -Role Student -OutputReport .\m77-student.json
```

Run each command on the relevant computer. To compare installed files with their pre-install hashes, pass `-BaselineReport .\dist-m76\m76-teacher-report.json` or the student equivalent. If installing to a custom directory, use `-InstallDirectory`.

3. Manually check Start Menu shortcut, opening/closing the app, student consent/stop button, and uninstallation in Windows Settings > Apps. The automated audit **does not** test those interactions or uninstall.
4. Run `node --test` to run the project tests.

**Security:** live mouse/keyboard input remains disabled. No EXE installer was built or tested in this development environment.
