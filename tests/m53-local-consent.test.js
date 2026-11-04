const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const native = fs.readFileSync(path.join(__dirname, '../windows/FBS.Student.Native/Program.cs'), 'utf8');
const latch = fs.readFileSync(path.join(__dirname, '../windows/FBS.Student.Native/LocalConsentLatch.cs'), 'utf8');
test('M53 native preview requires local approval confirmed for the current session', () => {
  assert.match(native, /localConsent\.CanPreview\(id\)/);
  assert.match(native, /localConsent\.ConfirmApproval\(id, response\.IsSuccessStatusCode\)/);
  assert.match(latch, /approvedSession == sessionId/);
});
test('M53 stop closes consent and native input stays disabled', () => {
  assert.match(native, /localConsent\.Close\(id\);\s*ClearPending\(\);/);
  assert.match(latch, /closed\.Add\(sessionId\)/);
  assert.match(native, /nativeInput\.Disable\(\)/);
  assert.doesNotMatch(native, /nativeInput\.EnableForVerifiedSession\(/);
});
