const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', 'windows', 'FBS.Teacher.Launcher');
const listener = fs.readFileSync(path.join(root, 'TeacherPinnedTlsListener.cs'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'TeacherPairingAuditForm.cs'), 'utf8');
for (const [name, source, pattern] of [
 ['lifecycle event', listener, /PresenceSessionChanged/],
 ['session IDs', listener, /Guid\.NewGuid\(\)/],
 ['open after verified proof', listener, /if \(verified\)[\s\S]*PresenceSessionChanged\?\.Invoke\(deviceId, presenceSessionId, true\)/],
 ['close in finally', listener, /finally\s*\{\s*try \{ PresenceSessionChanged\?\.Invoke\(deviceId, presenceSessionId, false\)/],
 ['observer errors isolated', listener, /diagnostics only/],
 ['per-device session sets', ui, /Dictionary<string, HashSet<Guid>> activePresence/],
 ['subscribe in persistent mode', ui, /listener\.PresenceSessionChanged \+= OnPresenceSessionChanged/],
 ['session removal by ID', ui, /sessions\.Remove\(sessionId\)/],
 ['session add by ID', ui, /sessions\.Add\(sessionId\)/],
 ['active and fresh state', ui, /live && fresh \? "متصل/],
 ['open but waiting state', ui, /"جلسة مفتوحة — انتظار نبضة"/],
 ['closed but recently verified state', ui, /"انتهت الجلسة — تحقق حديث"/],
 ['revoked devices remain revoked', ui, /"ملغى", "—", "غير مصرح"/],
 ['clear on stop', ui, /activePresence\.Clear\(\)/],
 ['UI thread marshaling', ui, /BeginInvoke\(\(Action\)\(\(\) =>/],
 ['identity only', listener, /No dispatch, no input injection/],
]) test(name, () => assert.match(source, pattern));
