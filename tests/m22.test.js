const test=require('node:test'),assert=require('node:assert/strict');
const {createControlLeases}=require('../control-lease');
test('student stop revokes only matching active session and records audit',()=>{
 const leases=createControlLeases();const a=leases.request('pc-1');
 assert.equal(leases.studentStop('pc-1','invalid'),false);
 assert.equal(leases.acknowledge('pc-1',a.sessionId,true),true);
 assert.equal(leases.studentStop('pc-1',a.sessionId),true);
 assert.equal(leases.pending('pc-1'),null);
 assert.equal(leases.studentStop('pc-1',a.sessionId),false);
 assert.equal(leases.audit.at(-1).event,'student-stop');
});
