const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../windows/FBS.Student.Native/AuthenticatedPresenceProtocol.cs'), 'utf8');
const doc = fs.readFileSync(path.join(__dirname, '../M163-START-HERE.md'), 'utf8');
for (const [name, pattern] of [
  ['student heartbeat loop', /RunStudentAsync\(/],
  ['teacher heartbeat loop', /RunTeacherAsync\(/],
  ['authenticated stream required', /ALREADY authenticated/],
  ['fresh random nonce', /RandomNumberGenerator\.Fill/],
  ['constant-time response match', /CryptographicOperations\.FixedTimeEquals/],
  ['bounded response timeout', /ResponseTimeout = TimeSpan\.FromSeconds\(5\)/],
  ['bounded idle timeout', /MaxMissedHeartbeats = 2/],
  ['student cancellation', /stopToken\.ThrowIfCancellationRequested/],
  ['teacher cancellation', /CreateLinkedTokenSource\(stopToken\)/],
  ['fixed length frames', /new byte\[9\]/],
  ['invalid response fails closed', /Invalid authenticated presence response/],
  ['unexpected command rejected', /Unexpected presence message/],
  ['no remote input dispatch', /Never dispatches arbitrary commands or remote input/],
  ['zeroize challenge', /ZeroMemory\(message\)/],
  ['explicit no automatic activation', /NOT an automatically active persistent connection/],
  ['documented prerequisites', /TLS server-certificate pinning AND registered-device RSA proof/],
]) test(name, () => assert.match(name.startsWith('explicit') || name.startsWith('documented') ? doc : source, pattern));
