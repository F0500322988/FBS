const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const src = fs.readFileSync('windows/FBS.Student.Native/Program.cs','utf8');
function section(start, end) { return src.split(start)[1].split(end)[0]; }
test('stop is local before HTTP and never re-enables button after failure', () => {
 const body=section('private async void StopControl()', '\n}');
 assert.ok(body.indexOf('locallyStoppedSession = id;') < body.indexOf('await localClient.PostAsync'));
 assert.ok(body.indexOf('ClearPending();') < body.indexOf('await localClient.PostAsync'));
 assert.doesNotMatch(body, /stop.Enabled = true/);
});
test('decline revokes locally before HTTP', () => {
 const body=section('private async System.Threading.Tasks.Task Decide(bool approved)', 'private void ClearPending()');
 assert.ok(body.indexOf('if (!approved)') < body.indexOf('await localClient.PostAsync'));
 assert.ok(body.indexOf('locallyStoppedSession = id;') < body.indexOf('await localClient.PostAsync'));
});
test('late approval response cannot restore stopped session', () => {
 const body=section('private async System.Threading.Tasks.Task Decide(bool approved)', 'private void ClearPending()');
 assert.match(body, /id != currentSession \|\| id == locallyStoppedSession/);
});
