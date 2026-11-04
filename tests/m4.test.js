const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createTeacherLan}=require('../teacher-lan');
const {getIdentity,signMessage}=require('../device-identity');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),https=require('node:https'),{execFileSync}=require('node:child_process');
test('LAN heartbeat registers a real device and rejects incorrect key',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fbs-tls-'));
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-keyout',path.join(dir,'key.pem'),'-out',path.join(dir,'cert.pem'),'-subj','/CN=FBS-test'],{stdio:'ignore'});
 process.env.FBS_TLS_CERT=path.join(dir,'cert.pem');process.env.FBS_TLS_KEY=path.join(dir,'key.pem');
 const request=(url,key,body)=>new Promise((resolve,reject)=>{const req=https.request(url,{method:'POST',rejectUnauthorized:false,headers:{'x-fbs-key':key}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode))});req.on('error',reject);req.end(body)});
 const lan=createTeacherLan({secret:'test-secret-1234567890',port:0,discoveryPort:49199,intervalMs:60000});
 await lan.start();
 try{
  const url=`https://127.0.0.1:${lan.server.address().port}/heartbeat`;
  const bad=await request(url,'incorrect','{}');
  assert.equal(bad,401);
  const good=await request(url,'test-secret-1234567890',JSON.stringify(signMessage(getIdentity(path.join(dir,'identity.json')),{id:'PC-01',platform:'win32'})));
  assert.equal(good,204);assert.equal(lan.devices.get('PC-01').ip,'127.0.0.1');
 }finally{await lan.stop();fs.rmSync(dir,{recursive:true,force:true});}
});
