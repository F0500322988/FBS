'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('M26 native input gate fails closed and cannot execute input',()=>{
 const root=path.join(__dirname,'../windows/FBS.Student.Native');
 const gate=fs.readFileSync(path.join(root,'ControlInputGate.cs'),'utf8');
 const ui=fs.readFileSync(path.join(root,'Program.cs'),'utf8');
 assert.match(gate,/InputEnabled => false/);
 assert.match(gate,/sequence <= lastSequence/);
 assert.match(gate,/now >= expiresAt/);
 assert.match(gate,/!studentApproved/);
 assert.match(ui,/inputGate\.Deactivate\(\)/);
 assert.doesNotMatch(gate+ui,/SendInput\(|mouse_event\(|keybd_event\(/);
});
