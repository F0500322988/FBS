const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const dgram=require('node:dgram');
const {spawn,execFileSync}=require('node:child_process');
const {once}=require('node:events');

test('real teacher and real student connect by explicit pinned TLS, enroll, decline and revoke on one computer', {timeout:30000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fbs-m170-lan-'));
 const cert=path.join(dir,'teacher.pem'),key=path.join(dir,'teacher-key.pem');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-subj','/CN=localhost','-days','1'],{stdio:'ignore'});
 const fixture={FBS_DEMO:'0',FBS_PAIRING_KEY:'m170-disposable-lab-key',FBS_TEACHER_PASSWORD:'m170-disposable-teacher-password',FBS_TLS_CERT:cert,FBS_TLS_KEY:key,FBS_ENROLLMENT_FILE:path.join(dir,'enrollment.json'),FBS_AGENT_PORT:'0',FBS_DISCOVERY_ENABLED:'0'};
 const previous=Object.fromEntries(Object.keys(fixture).map(name=>[name,process.env[name]]));Object.assign(process.env,fixture);
 const teacher=require('../server');let child;const occupied=dgram.createSocket('udp4');
 const until=async(callback)=>{const deadline=Date.now()+12000;while(Date.now()<deadline){const value=await callback();if(value)return value;if(child?.exitCode!==null&&child?.exitCode!==undefined)throw Error('Student exited before expected state');await new Promise(resolve=>setTimeout(resolve,100))}throw Error('Expected teacher/student state did not arrive')};
 try{
  await teacher.lan.start();
  await new Promise(resolve=>teacher.server.listen(0,'127.0.0.1',resolve));
  await new Promise(resolve=>occupied.bind(0,'0.0.0.0',resolve));
  const base=`http://127.0.0.1:${teacher.server.address().port}`;
  const login=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:fixture.FBS_TEACHER_PASSWORD})});
  assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
  const api=async(route,body)=>{const result=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:result.status,body:await result.json()}};
  const fingerprint=crypto.createHash('sha256').update(new crypto.X509Certificate(fs.readFileSync(cert)).raw).digest('hex');
  const token='ef'.repeat(32);
  child=spawn(process.execPath,['student-agent.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,FBS_DEVICE_ID:'M170-STUDENT',FBS_IDENTITY_FILE:path.join(dir,'student-identity.json'),FBS_LOCAL_PORT:'0',FBS_LOCAL_CONTROL_TOKEN:token,FBS_TEACHER_HOST:'127.0.0.1',FBS_TEACHER_PORT:String(teacher.lan.server.address().port),FBS_TEACHER_FINGERPRINT:fingerprint,FBS_DISCOVERY_PORT:String(occupied.address().port)},stdio:['ignore','pipe','pipe']});
  const localPort=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Student local endpoint startup timed out')),10000);child.once('error',e=>{clearTimeout(timer);reject(e)});child.once('exit',code=>{clearTimeout(timer);reject(Error('Student exited '+code))});let output='';child.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/Optional screen share: http:\/\/127\.0\.0\.1:(\d+)/);if(match){clearTimeout(timer);resolve(Number(match[1]))}})});
  const device=await until(async()=>{const result=await api('/api/status');return result.body.students.find(student=>student.id==='M170-STUDENT')});
  assert.equal(device.approved,false);assert.equal(device.online,true);
  assert.equal((await api('/api/control/request',{deviceId:device.id})).status,404,'unapproved device cannot receive a control session');
  assert.equal((await api('/api/enrollment/approve',{deviceId:device.id})).status,200);
  const approved=await api('/api/status');assert.equal(approved.body.students[0].approved,true);assert.equal(approved.body.features.remoteControl,false);
  const request=await api('/api/control/request',{deviceId:device.id});assert.equal(request.status,202);assert.equal(request.body.inputEnabled,false);
  const local=`http://127.0.0.1:${localPort}/control/local`;
  const pending=await until(async()=>{const result=await(await fetch(local,{headers:{'X-FBS-Local-Token':token}})).json();return result.session?.sessionId===request.body.session.sessionId?result:null});
  assert.equal(pending.inputEnabled,false);assert.equal(pending.session.status,'pending-native-consent');
  const decline=await fetch(local,{method:'POST',headers:{'X-FBS-Local-Token':token,'Content-Type':'application/json'},body:JSON.stringify({sessionId:pending.session.sessionId,approved:false})});assert.equal(decline.status,202);
  await until(async()=>{const state=await api('/api/control/sessions');return state.body.sessions.some(session=>session.status==='declined')});
  assert.equal((await api('/api/enrollment/revoke',{deviceId:device.id})).status,200);
  const revoked=await api('/api/status');assert.equal(revoked.body.students[0].approved,false);
  assert.equal((await api('/api/control/request',{deviceId:device.id})).status,404);
  assert.equal(JSON.parse(fs.readFileSync(fixture.FBS_ENROLLMENT_FILE,'utf8')).approved.length,0);
 }finally{
  if(child&&child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill();await exited;}
  try{occupied.close()}catch{}
  if(teacher.server.listening){teacher.server.closeAllConnections();await new Promise(resolve=>teacher.server.close(resolve));}
  if(teacher.lan.server.listening)await teacher.lan.stop();
  for(const [name,value]of Object.entries(previous)){if(value===undefined)delete process.env[name];else process.env[name]=value}
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
