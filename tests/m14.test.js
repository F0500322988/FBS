'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {getIdentity,signMessage,verifyMessage}=require('../device-identity');
test('device identity persists and signed challenge rejects replay and tampering',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fbs-m14-'));
 try{
  const file=path.join(dir,'identity.json'),a=getIdentity(file),b=getIdentity(file);
  assert.equal(a.id,b.id);assert.equal(a.publicKey,b.publicKey);
  const pkt=signMessage(a,{id:a.id,action:'heartbeat'});
  const seen=new Set();
  assert.equal(verifyMessage(pkt,a.publicKey,seen),true);
  assert.equal(verifyMessage(pkt,a.publicKey,seen),false);
  assert.equal(verifyMessage({...pkt,body:{id:'other'}},a.publicKey,new Set()),false);
  assert.equal(verifyMessage({...pkt,timestamp:Date.now()-30000},a.publicKey,new Set()),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
