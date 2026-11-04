'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {spawn,execFileSync}=require('node:child_process');const {once}=require('node:events');
test('real TLS teacher/student messages: authorization, received/read acknowledgement and revoke', {timeout:35000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fbs-m173-')),cert=path.join(dir,'cert.pem'),key=path.join(dir,'key.pem');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-subj','/CN=localhost','-days','1'],{stdio:'ignore'});
 const fixture={FBS_DEMO:'0',FBS_PAIRING_KEY:'m173-test-only-lab-key',FBS_TEACHER_PASSWORD:'m173-test-only-password',FBS_TLS_CERT:cert,FBS_TLS_KEY:key,FBS_ENROLLMENT_FILE:path.join(dir,'enrollment.json'),FBS_AGENT_PORT:'0',FBS_DISCOVERY_ENABLED:'0'};
 const previous=Object.fromEntries(Object.keys(fixture).map(k=>[k,process.env[k]]));Object.assign(process.env,fixture);
 const teacher=require('../server');let child;
 const until=async callback=>{for(let n=0;n<100;n++){const result=await callback();if(result)return result;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out waiting for message state');};
 try{
  await teacher.lan.start();await new Promise(r=>teacher.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+teacher.server.address().port;
  assert.equal((await fetch(base+'/api/messages')).status,401);
  const login=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:fixture.FBS_TEACHER_PASSWORD})});const cookie=login.headers.get('set-cookie').split(';')[0];
  const api=async(route,body,origin)=>{const r=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,'Content-Type':'application/json',...(origin?{Origin:origin}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,body:await r.json()};};
  const fingerprint=crypto.createHash('sha256').update(new crypto.X509Certificate(fs.readFileSync(cert)).raw).digest('hex'),token='ab'.repeat(32);
  child=spawn(process.execPath,['student-agent.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,FBS_DEVICE_ID:'MSG-PC',FBS_IDENTITY_FILE:path.join(dir,'identity.json'),FBS_LOCAL_PORT:'0',FBS_LOCAL_CONTROL_TOKEN:token,FBS_TEACHER_HOST:'127.0.0.1',FBS_TEACHER_PORT:String(teacher.lan.server.address().port),FBS_TEACHER_FINGERPRINT:fingerprint},stdio:['ignore','pipe','pipe']});
  const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Agent startup timed out')),8000);child.once('error',reject);let raw='';child.stdout.on('data',c=>{raw+=c;const match=raw.match(/Optional screen share: http:\/\/127\.0\.0\.1:(\d+)/);if(match){clearTimeout(timer);resolve(match[1]);}});});
  const local='http://127.0.0.1:'+port;
  const inbox=async()=>await(await fetch(local+'/messages/local',{headers:{'X-FBS-Local-Token':token}})).json();
  await until(async()=>teacher.lan.devices.has('MSG-PC'));
  assert.equal((await api('/api/messages',{text:'hello',deviceIds:['MSG-PC']})).status,409);
  assert.equal((await api('/api/enrollment/approve',{deviceId:'MSG-PC'})).status,200);
  assert.equal((await api('/api/messages',{text:'hello',deviceIds:['MSG-PC']},'https://evil.invalid')).status,403);
  const sent=await api('/api/messages',{text:'مرحبا <script>plain text</script>',deviceIds:['MSG-PC']});assert.equal(sent.status,202);
  const delivered=await until(async()=>{const v=await inbox();return v.messages.length?v:null;});assert.equal(delivered.messages[0].id,sent.body.id);assert.equal(delivered.messages[0].read,false);
  await until(async()=>{const v=await api('/api/messages');return v.body.messages[0].recipients[0].state==='received';});
  assert.equal((await fetch(local+'/messages/local')).status,403);
  const readOptions={method:'POST',headers:{'X-FBS-Local-Token':token,'Content-Type':'application/json'},body:JSON.stringify({id:sent.body.id})};
  assert.equal((await fetch(local+'/messages/local/read',{...readOptions,headers:{...readOptions.headers,Origin:local}})).status,403);
  assert.equal((await fetch(local+'/messages/local/read',readOptions)).status,202);
  await until(async()=>{const v=await api('/api/messages');return v.body.messages[0].recipients[0].state==='read';});
  const second=await api('/api/messages',{text:'pending revoke',deviceIds:['MSG-PC']});assert.equal(second.status,202);
  await api('/api/enrollment/revoke',{deviceId:'MSG-PC'});
  await until(async()=>!(await inbox()).messages.length);
  assert.equal((await api('/api/messages')).body.messages[0].recipients[0].state,'revoked');
  assert.equal((await api('/api/messages',{text:'no longer allowed',deviceIds:['MSG-PC']})).status,409);
 }finally{
  if(child&&child.exitCode===null&&child.signalCode===null){const done=once(child,'exit');child.kill();await done;}
  if(teacher.server.listening){teacher.server.closeAllConnections();await new Promise(r=>teacher.server.close(r));}
  if(teacher.lan.server.listening)await teacher.lan.stop();
  for(const[k,v]of Object.entries(previous))if(v===undefined)delete process.env[k];else process.env[k]=v;
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
