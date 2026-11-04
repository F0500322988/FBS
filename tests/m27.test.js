'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('M27 distinguishes stop submission from server confirmation',()=>{
 const agent=fs.readFileSync(path.join(__dirname,'../student-agent.js'),'utf8');
 const native=fs.readFileSync(path.join(__dirname,'../windows/FBS.Student.Native/Program.cs'),'utf8');
 const state=fs.readFileSync(path.join(__dirname,'../control-session-state.js'),'utf8');
 assert.match(state,/state:'submitted'/);
 assert.match(state,/state:'confirmed'/);
 assert.match(agent,/stopReceipt,previewCommands/);
 assert.match(native,/GetProperty\("stopReceipt"/);
 assert.match(native,/أكد الخادم إيقاف جلسة التحكم/);
 assert.doesNotMatch(native,/SendInput\(|mouse_event\(|keybd_event\(/);
});
