# M169 — Reliable native student startup

## Implemented

- The student app decrypts its existing current-user DPAPI pairing key and starts the bundled Node executable directly. Normal startup no longer depends on executing a PowerShell script.
- Existing hex-encoded PowerShell pairing files, including their trailing newline, remain supported. Invalid envelopes fail closed and are not replaced automatically.
- Startup is asynchronous and checks the local agent endpoint with its unique local token. A running process alone is not reported as readiness. Timeout, early exit and application closure clean up the process owned by this app.
- The local agent HTTP port is configurable for isolated tests; the native app fixes it to 4190. The default remains 4190.
- Installer compilation checks the compiler prerequisite before building executables.
- Test-Windows.cmd now requests a JSON report containing check names and results, without keys or passwords.

## Results actually executed on 4 November 2026

- JavaScript: 1430 passed, 0 failed, 0 skipped. Includes a real Node student process, ephemeral UDP/HTTP ports, valid token readiness, rejection of missing/wrong token and browser Origin, and rejection of consent for a nonexistent session.
- .NET portable setup/TLS tests: 32 passed. Includes malformed/unauthenticated readiness rejection and real local pinned TLS round trip and rejection tests.
- Windows projects compiled successfully. Self-contained win-x64 teacher, student and Windows-check executables are provided in the preview package.
- Extended Windows DPAPI tests were compiled, not executed on Linux. No Windows GUI or two-PC acceptance result was received from the user.

## Current limitation

The user has one Windows computer and asked the assistant to perform the steps. This cloud session has no connection to that computer. Do not claim that Test-Windows.cmd, DPAPI or GUI were run there. The prepared Windows CI workflow has not been uploaded or triggered. No publication or GitHub push was performed.

No new installer Setup EXE was produced. The prior Wine compiler attempt failed with Exec format error. Product features missing after M168 (remote input, broadcast, locking, messaging, file transfer and macOS) remain incomplete.
