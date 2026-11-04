'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('M31 local stop prevents same remote session from reappearing before server acknowledgement',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../student-agent.js'),'utf8');
 assert.match(source,/locallyStoppedSession=sessionId/);
 assert.match(source,/applyPoll\(controlState,result.session,requestRevision\)/);
 const state=fs.readFileSync(path.join(__dirname,'../control-session-state.js'),'utf8');
 assert.match(state,/state.stoppedIds.includes\(next.sessionId\)/);
});
test('M31 student UI preserves submitted status and only shows confirmed for matching receipt',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../windows/FBS.Student.Native/Program.cs'),'utf8');
 assert.match(source,/lastConfirmedStopSession/);
 assert.match(source,/stoppedSession.GetString\(\) != lastConfirmedStopSession/);
 assert.match(source,/ClearPending\(\);\s*status.Text = "تم إرسال طلب الإيقاف/);
});
