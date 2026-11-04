'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('M28 passes session ID to native preview and checks expiry, consent, sequence',()=>{
 const root=path.join(__dirname,'..');
 const agent=fs.readFileSync(path.join(root,'student-agent.js'),'utf8');
 const native=fs.readFileSync(path.join(root,'windows/FBS.Student.Native/Program.cs'),'utf8');
 const gate=fs.readFileSync(path.join(root,'windows/FBS.Student.Native/ControlInputGate.cs'),'utf8');
 assert.match(agent,/previewCommands.push\(\{sessionId:cmd.sessionId/);
 assert.match(native,/expiry <= DateTimeOffset.UtcNow/);
 assert.match(native,/state == "consented-no-input"/);
 assert.match(native,/verifiedPipeline\.Preview\(item, id/);
 const decision=fs.readFileSync(path.join(root,'windows/FBS.Student.Native/InputDryRun.cs'),'utf8');
 assert.match(decision,/gate.Accept\(sessionId, sequence.GetInt64/);
 assert.match(gate,/activeSession == sessionId/);
 assert.match(gate,/sequence <= lastSequence/);
 assert.match(gate,/InputEnabled => false/);
 assert.doesNotMatch(native,/SendInput\(|mouse_event\(|keybd_event\(/);
});
