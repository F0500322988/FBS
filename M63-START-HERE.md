# FBS Classroom M63 — Two-PC field evidence

M62 automated checks are not proof that native apps or screen sharing work on two physical PCs. M63 records manual evidence for both roles. No real keyboard/mouse control is enabled.

## Steps (Windows 11)

1. Run M62 on both real computers and keep the M62 reports. Use the existing approved teacher/student enrollment and visible consent workflow. Do not expose the server to the public internet.
2. In the extracted FBS-Classroom root, create separate templates:

```powershell
node .\windows\M63-Field-Evidence.js template Teacher m63-teacher.json
node .\windows\M63-Field-Evidence.js template Student m63-student.json
```

3. On each computer, observe each item. Change its `status` to `PASS` only if observed, or `FAIL` if not working; otherwise keep `NOT_TESTED`. Replace `note` with a specific, non-sensitive description of what happened (at least 8 characters). Never include passwords, tokens, private screen contents, or certificate keys.
4. Bring both JSON files together and verify:

```powershell
node .\windows\M63-Field-Evidence.js verify m63-teacher.json m63-student.json m63-summary.json
```

The verifier exits with code 1 if any check is missing, failed, untested, or invalid. A full PASS only means the *recorded manual checks* were completed. It does not enable native input or certify production readiness. Keep the reports for M64 troubleshooting.

## Observations (both roles)

- `device-discovery`: the actual enrolled device is displayed, not a simulated demo entry.
- `student-consent`: no preview before student explicitly consents.
- `screen-preview`: preview corresponds to actual student desktop.
- `visible-indicator`: student sees an unambiguous active-sharing indicator.
- `student-stop`: local stop immediately ends preview and denies further frames.
- `network-disconnect`: unplug/disconnect LAN and confirm sharing ends safely.
- `reconnect-requires-consent`: reconnect does not resume preview without fresh consent.

If any test fails, keep the status `FAIL` and preserve the observed behavior for diagnosis. Do not try to enable remote input as a workaround.
