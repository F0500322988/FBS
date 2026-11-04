const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.join(__dirname, '..', 'windows');
const client = fs.readFileSync(path.join(base,'FBS.Student.Native','PinnedLanPairingClient.cs'),'utf8');
const transport = fs.readFileSync(path.join(base,'FBS.Student.Native','PinnedLanTlsChannel.cs'),'utf8');
const server = fs.readFileSync(path.join(base,'FBS.Teacher.Launcher','TeacherPinnedTlsListener.cs'),'utf8');
const protocol = fs.readFileSync(path.join(base,'FBS.Student.Native','AuthenticatedPresenceProtocol.cs'),'utf8');
const checks = [
 ['student opt-in presence entry point',/public static async Task RunPresenceAsync\(/.test(client)],
 ['student validates device id',/if \(!ValidId\(deviceId\)\)/.test(client)],
 ['student uses pinned TLS channel',/PinnedLanTlsChannel.ConnectAsync\(/.test(client)],
 ['student proves device identity',/DeviceChallengeProof.Sign\(devicePrivateKey, nonce\)/.test(client)],
 ['student requires OK before presence',client.indexOf('throw new System.Security.Authentication.AuthenticationException("Device proof rejected")') < client.indexOf('await channel.RunVerifiedPresenceAsync')],
 ['student zeroes nonce',/ZeroMemory\(nonce\)/.test(client)],
 ['student zeroes signature',/ZeroMemory\(signature\)/.test(client)],
 ['raw TLS stream stays encapsulated',/internal Task RunVerifiedPresenceAsync/.test(transport)],
 ['server opt-in presence listener',/public async Task RunPresenceAsync\(PersistentManagedEnrollment registry/.test(server)],
 ['server reuses pairing proof',/HandlePairingAuditAsync\(client, registry, true, cancellationToken\)/.test(server)],
 ['server requires verified signature',server.indexOf('if (verified)') < server.indexOf('if (keepPresence)')],
 ['server runs heartbeat on TLS stream',/AuthenticatedPresenceProtocol.RunTeacherAsync\(tls/.test(server)],
 ['server checks revocation during heartbeat',/registry.GetRosterSnapshot\(\).Enrolled.Contains\(deviceId\)/.test(server)],
 ['server emits identity-scoped presence',/PresenceHeartbeatReceived\?\.Invoke\(deviceId, timestamp\)/.test(server)],
 ['server caps active sessions',/new\(40, 40\)/.test(server)],
 ['protocol has no input commands',!/SendInput|mouse_event|keybd_event/.test(protocol)],
 ['heartbeat has bounded read deadline',/HeartbeatInterval.Ticks \* MaxMissedHeartbeats \+ ResponseTimeout.Ticks/.test(protocol)],
 ['student cancellation stops heartbeat',/Task.Delay\(HeartbeatInterval, stopToken\)/.test(protocol)],
 ['server does not auto start presence mode',/public async Task RunPairingAuditAsync/.test(server) && /public async Task RunPresenceAsync/.test(server)]
];
for (const [name, ok] of checks) test('M164 '+name,()=>assert.equal(ok,true));
