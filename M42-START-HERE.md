# FBS Classroom M42 — Stop-safe student session state

This release adds a student-side state reducer to reject delayed HTTPS poll responses after local stop or denial. It keeps a bounded list of 128 stopped session IDs and allows a distinct new session. The student never executes remote input; WindowsInputAdapter remains disabled.

## Test

`node --test`

`node --check student-agent.js`

For native Windows validation, use `windows/Test-M41-Native.ps1` and the M34 LAN diagnostics. No Windows binary has been built here.

## Security notes

HTTPS peer fingerprint pinning remains in place. A failed stop request is not confirmation of server receipt. The agent continues to report a submitted receipt until server confirmation. This is development software, not a production-ready classroom controller.
