'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('M25 keeps session after approval until teacher confirms or expires',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../student-agent.js'),'utf8');
 assert.match(source,/if\(!body\.approved\)\{controlState=localClose\(controlState,sessionId,'denied'\)/);
 assert.match(source,/signedControl\('\/control\/ack'/);
});
test('M25 repairs malformed C# literal escapes from M24 and keeps input disabled',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../windows/FBS.Student.Native/Program.cs'),'utf8');
 assert.doesNotMatch(source,/\\n/);
 assert.match(source,/TryGetProperty\("previewCommands"/);
 assert.doesNotMatch(source,/SendInput\(|mouse_event\(|keybd_event\(/);
});
