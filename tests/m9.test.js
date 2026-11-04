'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {server}=require('../server');
test('control requests reject unknown devices',async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {
  const url='http://127.0.0.1:'+server.address().port;
  const res=await fetch(url+'/api/control/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({deviceId:'PC-01'})});
  assert.equal(res.status,404);
 } finally {await new Promise(resolve=>server.close(resolve));}
});
