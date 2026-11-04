# FBS Classroom M164 — Identity-verified persistent presence

M164 adds opt-in `RunPresenceAsync` on both the student pairing client and teacher TLS listener. The old pairing-only behavior remains unchanged. The server first validates the device RSA proof against the encrypted registry, then switches to fixed 9-byte ping/pong messages on the SAME TLS stream. A 25-second server read deadline and a 5-second student reply deadline apply. The server checks registry enrollment on every heartbeat and cancels the session if revoked. No remote-control commands are parsed.

These methods are **not yet wired to UI**; the existing teacher UI still uses pairing audit. Callers must opt into the new mode on BOTH sides and must provide the same certificate pin and existing device key. The student must expose an immediate stop control and cancel its token.

## Tests

`node --test tests/m164-persistent-presence.test.js`

`node --test`

`dotnet build windows/FBS.Teacher.Launcher/FBS.Teacher.Launcher.csproj`

`dotnet build windows/FBS.Student.Native/FBS.Student.Native.csproj`

No .NET SDK was available in the packaging environment; Windows builds and live LAN tests remain unverified.
