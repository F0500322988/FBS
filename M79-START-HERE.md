# FBS Classroom M79 — Windows install/uninstall lifecycle

This is an **audit workflow**, not an automated uninstaller. Actual installer execution and UI launch must be done on Windows 11. Live keyboard/mouse injection remains disabled.

1. Install the M76 Teacher and Student preview installers on separate Windows test computers.
2. On each computer, run from PowerShell: `powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M79-Install-Lifecycle.ps1 -Role Teacher -Phase Installed -OutputReport m79-teacher-installed.json` (use `Student` on the student computer).
3. Inspect the generated checks and manually launch the application. Confirm the shortcut launches the correct program. Do **not** mark a check true unless you personally observed it.
4. Uninstall via Windows Settings > Installed apps, then rerun with `-Phase Uninstalled`. Confirm the application, shortcut and uninstall entry were removed. Record the observed result.
5. For each role, create `m79-confirmation.json` with `{"launchObserved":true,"uninstallObserved":true,"liveInputEnabled":false}` **only after personally observing** launch and uninstall and independently confirming live input is disabled. Combine reports using `node .\windows\M79-Install-Lifecycle.js combine m79-teacher-installed.json m79-teacher-uninstalled.json m79-confirmation.json m79-teacher.json` (adjust role and filenames). The script deliberately leaves manual confirmations unverified.
6. Run `node .\windows\M79-Install-Lifecycle.js m79-teacher.json m79-student.json m79-review.json` to validate both combined reports.

Important: Installer output is not included in the source ZIP. Build the preview installers on Windows using M76. This stage does not prove actual installation or C# build in the assistant's environment.
