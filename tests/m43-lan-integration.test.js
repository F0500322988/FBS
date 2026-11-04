 'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),https=require('node:https');
const {execFileSync}=require('node:child_process');
const {createTeacherLan}=require('../teacher-lan');
const {createControlLeases}=require('../control-lease');
const {createControlCommands}=require('../control-commands');
const {signMessage}=require('../device-identity');
const {initialState,applyPoll,localClose}=require('../control-session-state');
function post(port,endpoint,key,packet){return new Promise((resolve,reject)=>{const raw=JSON.stringify(packet);const req=https.request({hostname:'127.0.0.1',port,path:endpoint,method:'POST',rejectUnauthorized:false,headers:{'X-FBS-Key':key,'Content-Type':'application/json','Content-Length':Buffer.byteLength(raw)}},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,body:body?JSON.parse(body):null}));});req.on('error',reject);req.end(raw);});}
function identity(id){const pair=crypto.generateKeyPairSync('ed25519');const keys={privateKey:pair.privateKey.export({type:'pkcs8',format:'pem'}),publicKey:pair.publicKey.export({type:'spki',format:'pem'})};return {id,keys,sign(extra={}){return signMessage(keys,{id,platform:'win32',...extra});}};}
test('M43 HTTPS two-student isolation, consent, stop and stale poll guard',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fbs-m43-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const cert=path.join(dir,'cert.pem'),key=path.join(dir,'key.pem');
 try{execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-subj','/CN=localhost','-days','1'],{stdio:'ignore'});}catch{t.skip('OpenSSL unavailable');return;}
 const oldCert=process.env.FBS_TLS_CERT,oldKey=process.env.FBS_TLS_KEY;process.env.FBS_TLS_CERT=cert;process.env.FBS_TLS_KEY=key;
 t.after(()=>{if(oldCert===undefined)delete process.env.FBS_TLS_CERT;else process.env.FBS_TLS_CERT=oldCert;if(oldKey===undefined)delete process.env.FBS_TLS_KEY;else process.env.FBS_TLS_KEY=oldKey;});
 const secret='m43-local-integration-secret-long';const lan=createTeacherLan({secret,port:0,discoveryPort:49998});const leases=createControlLeases(),commands=createControlCommands(),approved=new Map();
 lan.setApprovedKeys(approved);lan.setControlLeases(leases);lan.setControlCommands(commands);
 await new Promise((resolve,reject)=>{lan.server.once('error',reject);lan.server.listen(0,'127.0.0.1',resolve);});t.after(()=>new Promise(resolve=>lan.server.close(resolve)));
 const port=lan.server.address().port;const a=identity('LAB-01'),b=identity('LAB-02');
 for(const dev of [a,b]){assert.equal((await post(port,'/heartbeat',secret,dev.sign())).status,204);approved.set(dev.id,dev.keys.publicKey);}
 const sa=leases.request(a.id),sb=leases.request(b.id);assert.ok(sa&&sb);
 assert.equal((await post(port,'/control/ack',secret,a.sign({sessionId:sa.sessionId,approved:true}))).status,204);
 assert.equal((await post(port,'/control/ack',secret,b.sign({sessionId:sb.sessionId,approved:false}))).status,204);
 assert.equal(commands.submit(leases.pending(a.id),{type:'key-preview',key:'A'}).ok,true);
 assert.equal(commands.submit(leases.pending(b.id),{type:'key-preview',key:'B'}).ok,false);
 const aCommands=await post(port,'/control/commands',secret,a.sign());const bCommands=await post(port,'/control/commands',secret,b.sign());
 assert.equal(aCommands.status,200);assert.equal(aCommands.body.commands.length,1);assert.equal(aCommands.body.executed,false);
 assert.equal(bCommands.status,200);assert.equal(bCommands.body.commands.length,0);
 const aPoll=await post(port,'/control/poll',secret,a.sign());assert.equal(aPoll.body.inputEnabled,false);
 let local=applyPoll(initialState(),aPoll.body.session,0);assert.equal(local.session.sessionId,sa.sessionId);
 const oldRevision=local.revision;local=localClose(local,sa.sessionId,'stop');
 assert.equal((await post(port,'/control/stop',secret,a.sign({sessionId:sa.sessionId}))).status,204);
 assert.equal(applyPoll(local,aPoll.body.session,oldRevision).session,null);
 assert.equal((await post(port,'/control/commands',secret,a.sign())).body.commands.length,0);
 assert.equal((await post(port,'/control/ack',secret,a.sign({sessionId:sa.sessionId,approved:true}))).status,400);
 const newSession=leases.request(a.id);assert.ok(newSession&&newSession.sessionId!==sa.sessionId);
 assert.equal((await post(port,'/control/poll',secret,a.sign())).body.session.sessionId,newSession.sessionId);
 assert.equal(applyPoll(local,(await post(port,'/control/poll',secret,a.sign())).body.session,local.revision).session.sessionId,newSession.sessionId);
});
