const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../windows');
test('M41 native test project includes all referenced production source files',()=>{
 const cs=fs.readFileSync(path.join(root,'FBS.NativeGate.Tests/FBS.NativeGate.Tests.csproj'),'utf8');
 for(const name of ['ControlInputGate','PreviewPayloadPolicy','InputDryRun','SessionSafetyWatchdog'])
   assert.ok(cs.includes(name+'.cs'),name);
});
test('M41 UI uses watchdog and keeps native input disabled',()=>{
 const ui=fs.readFileSync(path.join(root,'FBS.Student.Native/Program.cs'),'utf8');
 const adapter=fs.readFileSync(path.join(root,'FBS.Student.Native/WindowsInputAdapter.cs'),'utf8');
 assert.match(ui,/SessionSafetyWatchdog.StopReason/);
 assert.match(adapter,/=> enabled = false;/);
});
test('M41 watchdog covers expiry, stop, consent and liveness',()=>{
 const w=fs.readFileSync(path.join(root,'FBS.Student.Native/SessionSafetyWatchdog.cs'),'utf8');
 for(const label of ['student-stop','consent-revoked','session-expired','agent-disconnected']) assert.ok(w.includes(label));
 assert.doesNotMatch(w,/SendInput\s*\(/);
});
