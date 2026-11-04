'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('M24 local preview requires local authentication and never injects input',()=>{
 const agent=fs.readFileSync(path.join(__dirname,'../student-agent.js'),'utf8');
 const native=fs.readFileSync(path.join(__dirname,'../windows/FBS.Student.Native/Program.cs'),'utf8');
 assert.match(agent,/authorizedLocalRequest\(req,localControlToken\)/);
 assert.match(agent,/previewCommands:pendingControl\?\.status==='consented-no-input'/);
 assert.match(native,/TryGetProperty\("previewCommands"/);
 assert.doesNotMatch(native,/SendInput\(|mouse_event\(|keybd_event\(/);
});
