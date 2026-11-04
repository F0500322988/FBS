# FBS Classroom M133 — Windows ACL Audit

This release adds a read-only Windows ACL audit for the persisted student stop ledger and its parent folder. It does not enable native mouse or keyboard input, change permissions, or prove that the ledger cannot be tampered with by the same user account.

Run on Windows 11 as the SAME account used to run FBS Student:

```powershell
node --test tests/m133-ledger-acl-audit.test.js
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M133-Ledger-Permissions.ps1 -ReportPath .\m133-acl-report.json
powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M132-Persistent-Restart.ps1
dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj
```

Interpretation:
- PASS: no broad write ACLs found on existing checked targets. This is only a limited ACL audit.
- INCOMPLETE_OR_REVIEW: file not yet created, or broad user-group permissions require administrator review.
- FAIL: Everyone/Anonymous has write access or ACL inspection failed. Script exits nonzero.

The script does not change ACLs. If the ledger has not yet been created, start a consented test session and stop it, then rerun the audit. Do not share the report publicly without reviewing computer/account metadata.

Windows/.NET tests and installer builds must be run on an actual Windows machine. Real remote input remains disabled pending authorization and verified safety testing.
