# FBS Classroom M65 — Single-Student Session Rehearsal

This stage adds a deterministic offline rehearsal of consent, preview, stop, disconnect, reconnect and timeout. It does **not** connect to any computer, enable input, or demonstrate that native input is safe.

## Run tests

```powershell
node --test
```

## Run one scenario

Use your *completed* M63 teacher/student evidence reports (all PASS with notes). From the project root:

```powershell
node .\windows\M65-Session-Rehearsal.js m63-teacher.json m63-student.json consent-preview-stop m65-session.json
```

Available scenarios: `consent-preview-stop`, `disconnect-reconsent`, `timeout`, `input-blocked`.

The command refuses to overwrite an existing report. If M63 evidence is missing, incomplete or failed, the generated report will have `passed: false` and the command will exit with an error code. The tool does not treat simulated tests as real Windows validation.

## Next step

Validate session safety on two physical Windows computers, inspect C# build logs, and only then consider a separately reviewed, explicit-consent input implementation. WindowsInputAdapter remains disabled.
