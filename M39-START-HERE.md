# FBS Classroom M39 — One-student input safety boundary (dry run)

M39 does NOT enable remote mouse/keyboard input. It adds independent validation at the student Node agent and Windows C# UI boundaries. Rejects stale, future, replayed, out-of-order, cross-session, malformed and unsupported preview commands. Accepted previews are display-only.

Run `node --test` and `node --check student-agent.js` on a development computer. On Windows 11 with Node.js and .NET 8 SDK run `powershell -ExecutionPolicy RemoteSigned -File .\windows\Test-M38-One-Student.ps1` to execute the native tests and build. Windows compilation and real two-device testing must be completed before considering OS input enablement. WARNING: The student agent currently relies on pinned teacher TLS fingerprint learned through a shared-key LAN announcement; production deployment requires further threat modeling and certificate/key lifecycle validation.
