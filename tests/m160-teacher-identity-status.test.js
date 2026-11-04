const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', 'windows', 'FBS.Teacher.Launcher');
const server = fs.readFileSync(path.join(root, 'TeacherPinnedTlsListener.cs'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'TeacherPairingAuditForm.cs'), 'utf8');
for (const [name, value] of [
  ['identity outcome event', /event Action<PairingAuditOutcome>\? PairingAuditCompleted/.test(server)],
  ['atomic accepted count', /Interlocked.Increment\(ref _accepted\)/.test(server)],
  ['atomic rejected count', /Interlocked.Increment\(ref _rejected\)/.test(server)],
  ['thread-safe counts read', /Interlocked.Read\(ref _accepted\)/.test(server)],
  ['outcome emitted in finally', /finally\s*\{\s*if \(accepted\)/.test(server)],
  ['subscriber cannot break cleanup', /catch \(Exception\) \{ \/\* diagnostic observer only \*\//.test(server)],
  ['only OK response on verified proof', /if \(verified\)\s*\{\s*accepted = true;/.test(server)],
  ['no control dispatch', !/ExecuteRemoteInput\(/.test(server)],
  ['Arabic counts UI', /تم التحقق: 0 \| مرفوض: 0/.test(ui)],
  ['bounded history', /auditLog.Items.Count > 40/.test(ui)],
  ['UI thread marshaling', /BeginInvoke\(\(Action\)/.test(ui)],
  ['no identifier in history', !/auditLog.Items.Insert\(0,.*DeviceId/.test(ui)],
  ['opt-in server startup', /listener.RunPairingAuditAsync/.test(ui)],
  ['stop button retained', /إيقاف الاستماع/.test(ui)],
  ['no automatic network startup', /start.Click \+= async/.test(ui)],
]) test('M160: ' + name, () => assert.ok(value));
