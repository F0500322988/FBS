# FBS Classroom M69 — Single-student preview-only release gate

This stage reviews the self-reported M68 field session and the existing M66 native-input safety simulations. It does **not** enable keyboard/mouse control or prove that Windows EXEs have been built.

## Run

From the FBS-Classroom directory on a machine with Node.js:

```powershell
node --test
node .\windows\M69-Session-Release-Gate.js m68-evidence.json m67-review.json m69-report.json
```

The input files must be the actual reports from your lab. The tool does not fabricate test observations. It writes a new report and refuses to overwrite inputs or an existing output file.

`passed: true` means only that the supplied field evidence is complete and consistent and that the static/native safety simulation passes. `approvedForLiveInput` and `liveInputEnabled` remain `false` by design. For the next stage, test the Windows binaries on one consenting student PC, capture actual failure logs, and confirm that student Stop immediately revokes screen preview.
