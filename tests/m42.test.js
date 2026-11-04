const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {initialState,applyPoll,localClose,confirmStop}=require('../control-session-state');
const session=(id,status='pending-native-consent')=>({sessionId:id,status,expiresAt:20000});
test('M42 stale in-flight poll cannot restore a stopped session',()=>{
 let s=applyPoll(initialState(),session('a'),0,100);
 s=localClose(s,'a','stop',110);
 assert.equal(applyPoll(s,session('a'),0,120).session,null);
 assert.equal(applyPoll(s,session('a'),s.revision,120).session,null);
});
test('M42 denial is a tombstone and a new session may proceed',()=>{
 let s=applyPoll(initialState(),session('a'),0,100);
 s=localClose(s,'a','denied',110);
 assert.equal(applyPoll(s,session('a'),s.revision,120).session,null);
 assert.equal(applyPoll(s,session('b'),s.revision,120).session.sessionId,'b');
});
test('M42 poll rejects expired or invalid sessions',()=>{
 const s=initialState();
 assert.equal(applyPoll(s,session('a'),0,20000).session,null);
 assert.equal(applyPoll(s,session('a','executing'),0,100).session,null);
});
test('M42 stop receipt confirms only the matching session',()=>{
 let s=applyPoll(initialState(),session('a'),0,100);
 s=localClose(s,'a','stop',110);
 assert.equal(confirmStop(s,'b').stopReceipt.state,'submitted');
 assert.equal(confirmStop(s,'a',130).stopReceipt.state,'confirmed');
});
test('M42 switching sessions clears preview commands',()=>{
 let s=applyPoll(initialState(),session('a'),0,100);
 s={...s,previewCommands:[{sequence:1}]};
 assert.equal(applyPoll(s,session('b'),s.revision,120).previewCommands.length,0);
});
test('M42 agent wires reducer into network and local stop paths',()=>{
 const agent=fs.readFileSync(require('node:path').join(__dirname,'../student-agent.js'),'utf8');
 for(const fn of ['applyPoll(controlState','localClose(controlState','confirmStop(controlState'])assert.ok(agent.includes(fn));
});
