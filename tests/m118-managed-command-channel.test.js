const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const dir = path.join(__dirname, '..', 'windows', 'FBS.Student.Native');
const guard = fs.readFileSync(path.join(dir, 'ManagedCommandChannelGuard.cs'), 'utf8');
const app = fs.readFileSync(path.join(dir, 'Program.cs'), 'utf8');
const adapter = fs.readFileSync(path.join(dir, 'WindowsInputAdapter.cs'), 'utf8');
for (const [name, regex] of [
  ['requires enrollment', /!enrolled/],
  ['requires authenticated local agent', /!localAgentAuthenticated/],
  ['requires visible student indicator', /!indicatorVisible/],
  ['rejects stopped sessions', /studentStopped/],
  ['rejects expired sessions', /now >= expiry/],
  ['limits lease to two minutes', /TimeSpan\.FromMinutes\(2\)/],
  ['rejects stale or replayed sequences', /number <= lastSequence/],
  ['checks command payload policy', /PreviewPayloadPolicy\.Valid/],
  ['revokes on liveness failure', /Revoke\(\);\s*return false;/],
  ['never grants input', /NativeInputEnabled => false/],
]) test(name, () => assert.match(guard, regex));
test('program checks command guard before preview', () => assert.ok(app.indexOf('commandChannel.AcceptPreview') < app.indexOf('verifiedPipeline.Preview(item')));
test('program revokes guard on stop', () => assert.match(app, /ClearPending\(\).*commandChannel\.Revoke\(\)/));
test('program checks visible banner', () => assert.match(app, /indicatorVisible: sessionBanner\.Visible/));
test('native adapter remains disabled', () => assert.match(adapter, /EnableForVerifiedSession\(bool explicitlyEnabledByOperator\)\s*=> enabled = false/));
