# FBS Classroom M66 — One-student safety matrix

This stage adds an offline deterministic safety matrix for a single Windows student. It does **not** send input, enable the native Windows input adapter, build an EXE, or prove a physical two-PC test.

## Run

From the FBS-Classroom root:

```powershell
node --test
node .\windows\M66-Single-Student-Gate.js m66-gate.json
```

To additionally validate completed M63 evidence (these must be genuine manual observations):

```powershell
node .\windows\M66-Single-Student-Gate.js m66-field-gate.json m63-teacher.json m63-student.json
```

Outputs use exclusive creation: an existing report will not be overwritten. The gate verifies eight simulation scenarios, native input source isolation, and optionally both field evidence reports. `passed: true` is **not** authorization to enable remote input. Keep consent visible and the student stop control available. Any real native input work requires separate build/runtime safety review on Windows 11.
