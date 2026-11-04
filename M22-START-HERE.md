# M22 — Student session stop (prototype)

- Student can send authenticated local stop request.
- Agent signs a stop request to teacher using the existing device key and pinned TLS channel.
- Teacher revokes the matching lease and logs the event.
- UI enables Stop during pending/consented sessions.

**Limitations:** The local agent responds 202 when forwarding a stop, not when the teacher confirms it. Polling refreshes every 2 seconds; a lost network message may require retry. No remote input injection is enabled. C# Windows build and real lab behavior are unverified.

Run `node --test` to verify JS tests.
