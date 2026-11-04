# FBS Classroom M26 — Native input authorization gate (dry run)

## Implemented
- Added a native C# `ControlInputGate` to track a student-approved session.
- Rejects stale sessions, repeated/out-of-order commands, wrong session IDs and unsupported command types.
- Resets the gate when a session changes or stops.
- **Fail-closed**: `InputEnabled` is always false. This phase DOES NOT move the mouse or type keys.

## Why no live input yet?
A secure input adapter requires a verified end-to-end teacher/session binding, server-confirmed
stop/revocation, native code compilation, and real Windows 11 tests. None has been established
by the current automated Node.js tests. Enabling SendInput now would be premature.

## Tests
`node --test`
`node --check student-agent.js`

The C# code has not been compiled in this environment. Before live input, test on one
isolated Windows 11 lab PC and confirm immediate stop, timeout and revocation.
