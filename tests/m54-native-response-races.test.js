const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const native = fs.readFileSync(path.join(__dirname, '../windows/FBS.Student.Native/Program.cs'), 'utf8');
test('M54 delayed approval checks expiration and agent liveness before confirming', () => {
  const start = native.indexOf('if (id != currentSession || id == locallyStoppedSession) return;');
  const end = native.indexOf('localConsent.ConfirmApproval', start);
  const guarded = native.slice(start, end);
  assert.match(guarded, /DateTimeOffset.UtcNow >= sessionExpiresAt/);
  assert.match(guarded, /lastAgentContact > TimeSpan.FromSeconds\(6\)/);
  assert.match(guarded, /localConsent.Close\(id\)/);
});
test('M54 late stop and decline responses cannot overwrite a new session UI', () => {
  assert.ok((native.match(/currentSession is null && locallyStoppedSession == id/g) || []).length >= 4);
});
test('M54 native input remains disabled', () => {
  assert.doesNotMatch(native, /nativeInput\.EnableForVerifiedSession\(/);
});
