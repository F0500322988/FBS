const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const teacher = fs.readFileSync(path.join(__dirname, '..', 'windows', 'FBS.Teacher.Launcher', 'TeacherPinnedTlsListener.cs'), 'utf8');
const protocol = fs.readFileSync(path.join(__dirname, '..', 'windows', 'FBS.Student.Native', 'AuthenticatedPresenceProtocol.cs'), 'utf8');

test('all three listener modes track accepted connections', () => {
  assert.equal((teacher.match(/TrackConnection\(client\);/g) || []).length, 3);
});
test('all listener shutdown paths close tracked connections', () => {
  assert.equal((teacher.match(/finally \{ _listener.Stop\(\); CloseAllConnections\(\); \}/g) || []).length, 3);
  assert.match(teacher, /public ValueTask DisposeAsync\(\)[\s\S]*CloseAllConnections\(\)/);
});
test('active sessions close sockets when cancellation is signaled', () => {
  assert.equal((teacher.match(/using var cancelSocket = sessionStop.Register/g) || []).length, 2);
});
test('both handler paths release tracked socket and semaphore slot', () => {
  assert.equal((teacher.match(/ReleaseConnection\(client\);/g) || []).length, 2);
  assert.equal((teacher.match(/_slots.Release\(\);/g) || []).length >= 5, true);
});
test('presence protocol still bounds stalled heartbeat reads', () => {
  assert.match(protocol, /MaxMissedHeartbeats/);
  assert.match(protocol, /timeout.CancelAfter\(TimeSpan.FromTicks/);
});
test('presence remains identity only', () => {
  assert.match(teacher, /No dispatch, no input injection/);
});
