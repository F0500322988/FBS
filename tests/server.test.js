const {test}=require('node:test');
const assert=require('node:assert/strict');
const {server}=require('../server');
test('status API exposes optional screen preview and defaults to no simulated devices',async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const res=await fetch(`http://127.0.0.1:${server.address().port}/api/status`);const data=await res.json();assert.equal(res.status,200);assert.equal(data.features.screenView,true);assert.equal(data.lab.capacity,40);if(process.env.FBS_DEMO!=='1'&&!process.env.FBS_PAIRING_KEY)assert.equal(data.students.length,0);}
 finally{await new Promise(resolve=>server.close(resolve));}
});
