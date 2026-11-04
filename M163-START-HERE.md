# M163 — Authenticated presence heartbeat protocol

This phase adds `windows/FBS.Student.Native/AuthenticatedPresenceProtocol.cs`.
It is a **stream-level building block**, NOT an automatically active persistent connection.

## Protocol
After TLS server-certificate pinning AND registered-device RSA proof, the student sends
9 bytes: `0x50` followed by a fresh 8-byte random challenge. The teacher returns
`0x51` followed by the identical challenge. The student rejects mismatches. Heartbeats
repeat every 10 seconds; a response is due within 5 seconds. The teacher terminates
an idle connection after 25 seconds. Cancellation stops both loops. The owning caller
must dispose the TLS stream promptly when the student presses Stop.

**Do not call these methods before completing both authentication steps.** They do
not themselves authenticate peers, connect sockets, manage device registration,
or provide a control session. No input injection or command dispatcher exists here.

## Run
`node --test tests/m163-authenticated-presence.test.js`
`node --test`
`dotnet build .\windows\FBS.Student.Native\FBS.Student.Native.csproj`

.NET and actual Windows-to-Windows TLS runtime tests are required before production.
