const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const student = fs.readFileSync(path.join(root,'windows/FBS.Student.Native/StudentPairingTestForm.cs'),'utf8');
const teacher = fs.readFileSync(path.join(root,'windows/FBS.Teacher.Launcher/TeacherPairingAuditForm.cs'),'utf8');
const listener = fs.readFileSync(path.join(root,'windows/FBS.Teacher.Launcher/TeacherPinnedTlsListener.cs'),'utf8');
const cases = [
 ['student polling is opt-in', /CheckBox periodic.*متابعة حالة الجهاز/],
 ['student polls with existing authenticated pairing', /PinnedLanPairingClient.ProveIdentityAsync/],
 ['student uses a 10 second interval', /Task.Delay\(TimeSpan.FromSeconds\(10\), running.Token\)/],
 ['student stops on failed proof', /if \(!verified \|\| !repeat\) break/],
 ['student cancels on close', /FormClosing \+= \(_, _\) => running\?\.Cancel\(\)/],
 ['student offers stop button', /running\?\.Cancel\(\)/],
 ['student disables opt-in while running', /periodic.Enabled = false/],
 ['student re-enables opt-in after stop', /periodic.Enabled = true/],
 ['student does not auto-connect', /start.Click \+= async/],
];
for(const [name,regex] of cases) test(name,()=>assert.match(student,regex));
const teacherCases = [
 ['teacher uses 30s freshness window', /PresenceWindow = TimeSpan.FromSeconds\(30\)/],
 ['teacher refreshes every five seconds', /Timer presenceTimer = new\(\) \{ Interval = 5000 \}/],
 ['teacher shows presence column', /roster.Columns.Add\("Presence"/],
 ['teacher expires stale proofs', /DateTimeOffset.UtcNow - seen <= PresenceWindow/],
 ['teacher clears presence when stopped', /lastVerified.Clear\(\);\s*roster.Rows.Clear\(\)/],
 ['teacher labels state as proof freshness, not continuous TLS', /ليس اتصالًا مباشرًا أو جلسة تحكم أو اتصال TLS مستمرًا/],
 ['listener remains identity only', /Close after identity proof\. No dispatch, no input injection/],
];
for(const [name,regex] of teacherCases) test(name,()=>assert.match(name==='listener remains identity only'?listener:teacher,regex));
