'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {signMessage,getIdentity}=require('../device-identity');
const {pinnedRequest}=require('../pinned-https');

test('desktop capability and automatic signed enrollment over real TLS; revocation survives restart',{timeout:20000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fbs-m190-')),cert=path.join(dir,'cert.pem'),key=path.join(dir,'key.pem');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-subj','/CN=localhost','-days','1'],{stdio:'ignore'});
 const env={PORT:'4197',FBS_DEMO:'0',FBS_PAIRING_KEY:'fixture-m190-only-lab-key',FBS_TEACHER_PASSWORD:'fixture-m190-only-password',FBS_DESKTOP_TOKEN:'ab'.repeat(32),FBS_AUTO_ENROLL:'1',FBS_TLS_CERT:cert,FBS_TLS_KEY:key,FBS_ENROLLMENT_FILE:path.join(dir,'enrollment.json'),FBS_AGENT_PORT:'0',FBS_DISCOVERY_ENABLED:'0'};
 Object.assign(process.env,env);
 const teacher=require('../server');
 try {
  await teacher.lan.start();await new Promise(r=>teacher.server.listen(Number(env.PORT),'127.0.0.1',r));
  const base='http://127.0.0.1:'+env.PORT;
  const desktop=async(headers={})=>fetch(base+'/api/desktop/session',{method:'POST',headers});
  assert.equal((await desktop()).status,403);
  assert.equal((await desktop({'X-FBS-Desktop-Token':'cd'.repeat(32)})).status,403);
  assert.equal((await desktop({'X-FBS-Desktop-Token':env.FBS_DESKTOP_TOKEN,Origin:'https://other.invalid'})).status,403);
  assert.equal(await new Promise((resolve,reject)=>{
   const q=require('node:http').request(base+'/api/desktop/session',{method:'POST',headers:{'X-FBS-Desktop-Token':env.FBS_DESKTOP_TOKEN,Host:'other.invalid'}},r=>{r.resume();r.on('end',()=>resolve(r.statusCode));});q.on('error',reject);q.end();
  }),403);
  assert.equal((await fetch(base+'/api/enrollment/devices')).status,401);
  const response=await desktop({'X-FBS-Desktop-Token':env.FBS_DESKTOP_TOKEN});assert.equal(response.status,200);
  const cookie=response.headers.get('set-cookie');assert.match(cookie,/HttpOnly; SameSite=Strict; Path=\/$/);assert.doesNotMatch(cookie,/Max-Age|Expires/);
  const raw=await response.text();assert.equal(raw,'{"ok":true}');assert.ok(!raw.includes(env.FBS_DESKTOP_TOKEN));
  const headers={Cookie:cookie.split(';')[0],'Content-Type':'application/json'};
  assert.equal((await(await fetch(base+'/api/auth',{headers})).json()).authenticated,true);
  const identity=getIdentity(path.join(dir,'identity.json'));
  const body={id:'MAC-TEST',platform:'darwin',powerSupported:true};
  const fingerprint=crypto.createHash('sha256').update(new crypto.X509Certificate(fs.readFileSync(cert)).raw).digest('hex');
  const heartbeat=(packet,secret=env.FBS_PAIRING_KEY)=>new Promise((resolve,reject)=>{
   const request=pinnedRequest({hostname:'127.0.0.1',port:teacher.lan.server.address().port,path:'/heartbeat',method:'POST',fingerprint,headers:{'X-FBS-Key':secret,'Content-Type':'application/json'}},r=>{r.resume();r.on('end',()=>resolve({status:r.statusCode,approved:r.headers['x-fbs-approved']}));});
   request.on('error',reject);request.end(JSON.stringify(packet));
  });
  assert.equal((await heartbeat(signMessage(identity,body),'wrong-fixture-secret')).status,401);
  const forged=signMessage(identity,body);forged.body.id='FORGED';assert.equal((await heartbeat(forged)).status,400);
  const packet=signMessage(identity,body);assert.deepEqual(await heartbeat(packet),{status:204,approved:'1'});
  assert.equal((await heartbeat(packet)).status,400,'replayed identity proof rejected');
  assert.equal((await fetch(base+'/api/enrollment/scan',{method:'POST',body:'{}'})).status,401);
  assert.equal((await fetch(base+'/api/enrollment/scan',{method:'POST',headers:{...headers,Origin:'https://other.invalid'},body:'{}'})).status,403);
  assert.equal((await fetch(base+'/api/enrollment/scan',{method:'POST',headers,body:JSON.stringify({first:'8.8.8.8',last:'8.8.8.8'})})).status,400);
  const devices=await(await fetch(base+'/api/enrollment/devices',{headers})).json();assert.equal(devices.devices[0].approved,true);
  const another=getIdentity(path.join(dir,'another.json'));
  assert.equal((await heartbeat(signMessage(another,body))).status,400,'cannot replace trusted identity');
  assert.equal((await fetch(base+'/api/enrollment/revoke',{method:'POST',headers,body:JSON.stringify({deviceId:body.id})})).status,200);
  assert.equal((await heartbeat(signMessage(identity,body))).approved,'0','explicit revoke persists despite auto enrollment');
  const persisted=require('../enrollment').createEnrollment(env.FBS_ENROLLMENT_FILE);assert.ok(persisted.blocked.has(body.id));assert.ok(!persisted.approved.has(body.id));
  assert.equal((await fetch(base+'/api/enrollment/approve',{method:'POST',headers,body:JSON.stringify({deviceId:body.id})})).status,200);
  assert.equal((await heartbeat(signMessage(identity,body))).approved,'1','explicit administrator reapproval works');
  await fetch(base+'/api/logout',{method:'POST',headers});assert.equal((await fetch(base+'/api/enrollment/devices',{headers})).status,401);
 }finally{
  teacher.server.closeAllConnections();if(teacher.server.listening)await new Promise(r=>teacher.server.close(r));
  if(teacher.lan.server.listening)await teacher.lan.stop();fs.rmSync(dir,{recursive:true,force:true});
 }
});

test('failed durable enrollment does not authorize a device in memory',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fbs-m190-durable-')),file=path.join(dir,'enrollment.json');
 try {
  const store=require('../enrollment').createEnrollment(file);
  fs.mkdirSync(file);
  assert.throws(()=>store.approve('DEVICE','fixture-public-key'));
  assert.equal(store.approved.has('DEVICE'),false);assert.equal(store.keys.has('DEVICE'),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
