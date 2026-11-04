# FBS Classroom M151 — Teacher-local enrollment management

## What changed
The existing teacher audit window now has an Arabic **إدارة تسجيل الأجهزة (مسؤول المعمل)** button. It checks the selected private directory ACL, verifies the three existing encrypted files are nonempty and not reparse points, opens the Windows DPAPI-backed administrator service and displays the existing authenticated enrollment/revocation form. The admin password is required per operation. No remote enrollment endpoint, default password, automatic provisioning or keyboard/mouse injection is introduced.

The teacher launcher references the existing FBS.Student.Native assembly for shared enrollment code and the same ACL validator used by the administrator auditor. This is a temporary code-sharing arrangement; the security-sensitive code should ultimately move to a dedicated shared library instead of referencing a student executable.

## Windows 11 commands
```
node --test tests/m151-teacher-enrollment.test.js
node --test
dotnet build .\windows\FBS.Teacher.Launcher\FBS.Teacher.Launcher.csproj
```

Launch the teacher program, select **Yes** for the local admin audit, select your existing administrator directory, and click **إدارة تسجيل الأجهزة (مسؤول المعمل)**. Supply the administrator password to register/revoke. To register, choose the student's *trusted, out-of-band verified* RSA public key in DER SubjectPublicKeyInfo format and device ID. Do not accept keys solely based on unauthenticated network claims.

## Limitations
The existing student registry still needs a secure, authenticated distribution/synchronization design before these local changes can manage a different PC. This feature changes the teacher machine's local registry only. Do not copy DPAPI-protected admin credentials to students. Native Windows build and UI operation require testing on Windows with .NET 8; JavaScript tests only verify source wiring. No final installer is provided.
