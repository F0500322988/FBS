# M168 — Windows first-run setup and installer build preparation

This is a preview milestone, not a final release or a Windows acceptance sign-off.

## Implemented

- Teacher first-run form: masked lab key and password, password confirmation, PEM certificate selection or local certificate generation, key/certificate matching and validity checks.
- Generated certificates have a DNS/IP subject alternative name, a fresh 3072-bit RSA key, TLS server usage and a one-year lifetime. Generated private-key directories are restricted to the creating Windows account.
- Teacher connection settings are protected with current-user Windows DPAPI. Existing settings are not overwritten automatically. Child-process environment values carry the settings to Node without command-line secrets.
- Enrollment data is stored below the teacher's LocalAppData, outside installed Program Files. Startup waits for the authenticated HTTP endpoint and stops its own server on failure or closure.
- Student first-run form saves the lab key using the current-user DPAPI format consumed by the existing PowerShell launcher. It does not automatically enroll devices, authorize control or start screen capture.
- Correct installer executable names; unified preview version and build route through the M76 templates. No automatic post-install launch or startup shortcut in the canonical installers.
- Distribution verifier now requires authenticated transport dependencies and all referenced UI modules, and rejects empty files.
- A manually triggered Windows CI workflow builds installers, runs DPAPI compatibility tests and tests installation/demo HTTP/uninstallation on an isolated runner.

## Validation actually performed in Linux

- JavaScript: 1429 passed, 0 failed, 0 skipped.
- Certificate and local TLS suite: 23 passed, including framed TLS round trip, wrong pin rejection and wrong hostname rejection.
- Existing native gate/consent tests completed successfully.
- Fixed a null-salt administrator vault validation bug and removed an unused status field; the latest publish output contains no compiler warnings.
- Windows teacher, student and Windows setup-check EXEs were published successfully as self-contained win-x64 binaries.
- Installer source contract passed before packaging. No Setup EXE was produced: the attempted isolated Wine compiler failed with `Exec format error`.

## Not yet executed

- Windows DPAPI/PowerShell runtime checks: their EXE is built, but must run on Windows.
- Windows first-run forms, certificate directory ACL behavior, installed runtime and uninstallation.
- The new GitHub Actions workflow: saved as source only; not uploaded or triggered.
- Two-computer discovery, pairing, revocation, disconnection and reconnect.

## One Windows computer trial

Use the M168 portable preview and its START-HERE-AR.md. Run Test-Windows.cmd first, then try Teacher/FBS.Teacher.exe and Student/FBS.Student.Native.exe separately. This does not require installing Node.js or the .NET SDK. These are development binaries without code signing, not a production installer.

For developers building installers on Windows: install Node.js 22+, .NET 8 SDK and Inno Setup 6, then run `windows/Build-Installers.ps1` from a trusted local checkout. It requires fresh `release` and `release-packages` destinations. Alternatively manually run `.github/workflows/windows-preview.yml` after the source is uploaded to GitHub with the user's authorization. Neither upload nor publication was performed here.

## Remaining product work

Actual remote input remains disabled. Teacher broadcast, locking, file delivery, messaging, full device lifecycle/credential rotation, classroom load testing, code signing and macOS implementation/packaging remain outside this milestone. Do not describe the preview as a finished classroom-management product.
