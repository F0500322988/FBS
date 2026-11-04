# FBS Classroom — M157 Student LAN Identity Test UI

M157 adds a **manual**, visible Arabic Windows Forms identity test to the student application.

## Windows 11 verification

From the `FBS-Classroom` directory:

```powershell
node --test tests/m157-student-pairing-ui.test.js
node --test
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
```

Launch the student application and select **اختبار هوية الجهاز (LAN)**. Enter the teacher server DNS hostname (must match the TLS certificate), its configured port, and the full SHA-256 fingerprint of the certificate (64 hexadecimal characters). Obtain the fingerprint through an authenticated administrator channel, **not** the untrusted network being tested. Click **اختبار الهوية** and use **إيقاف الاختبار** to cancel.

The teacher must separately configure and start the M156 listener and approve the student's exact device ID and public key in the enrollment registry. This release does not automate public-key enrollment or certificate distribution. Windows CNG keys are user-scoped: run the student app as the same Windows user that owns the enrolled key. The UI never exports the private key.

A successful response means only that the server verified a signature over its challenge. It does not grant remote-control permissions or establish a persistent classroom session. No input injection is enabled.

## Limitations

- JavaScript tests include static checks; they are not Windows runtime tests.
- No Windows .NET SDK or Windows host is available in the build environment; build and end-to-end LAN validation must occur on Windows 11.
- The M156 teacher listener and M155 student protocol require a real two-machine interoperability test; any protocol mismatch will appear as a failed test, not an authorization bypass.
- The existing UI for student consent and emergency stop remains unchanged.
