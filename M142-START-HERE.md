# FBS Classroom M142 — Local administrator enrollment dialog

M142 adds `ManagedEnrollmentAdminForm.cs`: a Windows Forms Arabic/RTL local management dialog. It accepts a device ID, an RSA SubjectPublicKeyInfo DER file, and an administrator password; it calls `ManagedEnrollmentCommandService` for authenticated register/revoke. Password is cleared after each attempt, and errors do not disclose credential details.

**Integration status:** The dialog is a reusable component, compiled into the student Windows project, but is **not launched by the student application or connected to a teacher UI, server endpoint, or network registration flow**. A trusted management host must provision and inject `ManagedEnrollmentCommandService` and protect its encrypted state and keys. Do not open this on student desktops. There are no default credentials.

Run on Windows 11 (Node.js and .NET 8 SDK required):

```powershell
node --test tests/m142-admin-enrollment-ui.test.js
node --test
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M129-Native-Safety.ps1
```

The Linux development environment cannot compile or execute WinForms. Native mouse/keyboard input remains disabled. This is not an EXE installer and does not prove remote enrollment security.
