# FBS Classroom M29 — Windows input adapter (DISABLED)

## Added
- `windows/FBS.Student.Native/WindowsInputAdapter.cs`: Windows SendInput wrapper for absolute pointer movement and basic Unicode alphanumeric taps.
- Adapter starts **disabled** and is disabled again on session change and stop.
- The existing application never calls the adapter's enabling or input methods.
- This is groundwork for a later opt-in, end-to-end verified Windows test. **No remote input works in M29.**

## Security and test limits
- Do not enable the adapter until end-to-end server authorization, session binding, replay protection, immediate local stop and timeout are verified on a test PC.
- The native C# application has **not** been compiled or run in this environment. Node tests are source-level checks, not Windows integration tests.
- Run `node --test` and `node --check student-agent.js`.
