const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const https=require('node:https');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {configuredTeacher}=require('../teacher-endpoint');
const {pinnedRequest,isTrustedCertificate}=require('../pinned-https');

test('explicit endpoint requires a complete trusted address, port and certificate pin',()=>{
 assert.equal(configuredTeacher({}),null);
 const good={FBS_TEACHER_HOST:'127.0.0.1',FBS_TEACHER_PORT:'4180',FBS_TEACHER_FINGERPRINT:'AB'.repeat(32)};
 assert.deepEqual(configuredTeacher(good),{host:'127.0.0.1',port:4180,fingerprint:'ab'.repeat(32)});
 for(const bad of [
  {...good,FBS_TEACHER_HOST:'https://teacher'}, {...good,FBS_TEACHER_HOST:'teacher/path'},
  {...good,FBS_TEACHER_HOST:'user@teacher'}, {...good,FBS_TEACHER_HOST:' teacher'},
  {...good,FBS_TEACHER_HOST:'teacher..lab'}, {...good,FBS_TEACHER_PORT:'0'},
  {...good,FBS_TEACHER_PORT:'65536'}, {...good,FBS_TEACHER_FINGERPRINT:'not-a-pin'},
  {FBS_TEACHER_HOST:'teacher'}, {...good,FBS_TEACHER_PORT:undefined}
 ])assert.throws(()=>configuredTeacher(bad));
});

test('pinned TLS sends no HTTP headers or body until the certificate pin is verified',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fbs-m170-pin-'));
 const cert=path.join(dir,'cert.pem'),key=path.join(dir,'key.pem');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-subj','/CN=localhost','-days','1'],{stdio:'ignore'});
 let received=0;
 const server=https.createServer({cert:fs.readFileSync(cert),key:fs.readFileSync(key)},(req,res)=>{received++;req.resume();req.on('end',()=>{res.writeHead(204);res.end()})});
 server.on('tlsClientError',()=>{});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});});
 const fingerprint=crypto.createHash('sha256').update(new crypto.X509Certificate(fs.readFileSync(cert)).raw).digest('hex');
 const certificate=new crypto.X509Certificate(fs.readFileSync(cert));
 const expected=Buffer.from(fingerprint,'hex');
 assert.equal(isTrustedCertificate(certificate.raw,expected),true);
 assert.equal(isTrustedCertificate(certificate.raw,expected,Date.parse(certificate.validFrom)-1),false,'not-yet-valid certificate rejected even with correct pin');
 assert.equal(isTrustedCertificate(certificate.raw,expected,Date.parse(certificate.validTo)),false,'expired certificate rejected even with correct pin');
 assert.equal(isTrustedCertificate(Buffer.from('not a certificate'),expected),false);
 const send=pin=>new Promise((resolve,reject)=>{
  const request=pinnedRequest({host:'127.0.0.1',port:server.address().port,fingerprint:pin,path:'/fixture',method:'POST',headers:{'X-FBS-Key':'disposable-fixture-key'},timeout:3000},response=>{response.resume();response.on('end',()=>resolve(response.statusCode))});
  request.on('error',reject);request.on('timeout',()=>request.destroy(Error('Request timeout')));request.end('fixture-body');
 });
 await assert.rejects(send('00'.repeat(32)),/certificate mismatch/);
 assert.equal(received,0,'wrong-pin peer must receive neither request headers nor body');
 assert.equal(await send(fingerprint),204);
 assert.equal(received,1);
});
