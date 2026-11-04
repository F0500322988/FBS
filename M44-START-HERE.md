# FBS Classroom M44 — Two-PC Windows LAN Verification

This is a **diagnostic kit**, not an EXE installer or a completed real-input implementation. Input injection remains disabled.

## Requirements

- Two Windows 11 PCs on the same authorized lab network, teacher TLS service running on TCP 4180.
- PowerShell 5.1+; Node.js and .NET 8 SDK only needed with `-RunBuild`.
- Obtain the SHA-256 **DER certificate** fingerprint from the teacher TLS certificate through a trusted channel, not from an untrusted network response.

## Teacher PC

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M44-Two-PC.ps1 -Role Teacher -ReportPath .\m44-teacher.json -RunBuild
```

## Student PC

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M44-Two-PC.ps1 -Role Student -TeacherIP 192.168.1.10 -ExpectedCertSha256 YOUR_64_HEX_FINGERPRINT -ReportPath .\m44-student.json -RunBuild
```

The TLS diagnostic deliberately allows a handshake to read the certificate, then **fails identity verification** unless the SHA-256 fingerprint matches an independently trusted value. It does not send credentials or student data during the diagnostic. This is not a substitute for the production app's certificate validation.

## Manual checklist (must be completed on real devices)

1. Confirm student discovery and signed enrollment in teacher UI.
2. Confirm real student screen preview, with student knowledge and appropriate lab authorization.
3. Request a control-preview session; student explicitly accepts; observe preview only.
4. Student presses Stop; confirm both UIs show stopped and delayed messages cannot reopen it.
5. Disconnect LAN and confirm fail-closed within configured timeout.
6. Confirm all input injection remains disabled.

A PASS result only describes automated checks. Manual items remain MANUAL; `readyForLiveInput` is always false. Do not share pairing keys or private keys in diagnostic reports.
