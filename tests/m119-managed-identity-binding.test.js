const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname,'../windows/FBS.Student.Native/ManagedIdentityBinding.cs'),'utf8');
for (const [name, expression] of [
 ['requires teacher authentication', /!teacherAuthenticated/],
 ['requires device enrollment', /!deviceEnrolled/],
 ['requires visible indicator', /!studentIndicatorVisible/],
 ['requires no local stop', /studentStopped/],
 ['requires authenticated transport', /!authenticatedTransport/],
 ['rejects missing teacher identifier', /TryString\(command, "teacherId"/],
 ['rejects missing device identifier', /TryString\(command, "deviceId"/],
 ['rejects missing session identifier', /TryString\(command, "sessionId"/],
 ['compares teacher identity', /string\.Equals\(teacherId, teacher, StringComparison\.Ordinal\)/],
 ['compares device identity', /string\.Equals\(deviceId, device, StringComparison\.Ordinal\)/],
 ['compares session identity', /string\.Equals\(sessionId, session, StringComparison\.Ordinal\)/],
 ['revokes on transport loss', /if \(!authenticatedTransport[^]*?Revoke\(\);/],
 ['clears identity on revocation', /teacherId = deviceId = sessionId = null/],
 ['does not enable native input', /NativeInputEnabled => false/]
]) test(name,()=>assert.match(src,expression));
