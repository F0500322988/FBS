'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {range,address,createIpScanner}=require('../lan-ip-scan');
test('IP ranges reject malformed, public, reversed and excessive ranges',()=>{
 for(const [a,b]of [['127.0.0.1','127.0.0.2'],['8.8.8.8','8.8.8.8'],['192.168.1.256','192.168.1.256'],['192.168.01.1','192.168.1.2'],['10.0.0.2','10.0.0.1'],['10.0.0.1','10.0.4.1'],['169.254.1.1','169.254.1.2'],['172.15.1.1','172.15.1.2']])assert.throws(()=>range(a,b));
 assert.equal(range('10.0.0.0','10.0.3.255').count,1024);
 assert.equal(range('172.17.30.61','172.17.30.61').count,1);
 assert.equal(address(range('192.168.1.10','192.168.1.20').end),'192.168.1.20');
});
test('scan includes both boundaries, uses fresh verified devices only and excludes stale or outside addresses',async()=>{
 const devices=new Map([['STALE',{id:'STALE',ip:'192.168.1.11',lastSeen:Date.now()-60000}],['OUTSIDE',{id:'OUTSIDE',ip:'192.168.1.50',lastSeen:Date.now()+1000}]]),sent=[];
 const scanner=createIpScanner({devices,waitMs:5,announce:async ip=>{sent.push(ip);if(ip.endsWith('.10')||ip.endsWith('.12'))devices.set(ip,{id:ip,ip,lastSeen:Date.now()});}});
 const result=await scanner.scan('192.168.1.10','192.168.1.12');assert.deepEqual(sent,['192.168.1.10','192.168.1.11','192.168.1.12']);assert.equal(result.scanned,3);assert.equal(result.found.length,2);
});
test('concurrent scans are rejected and failure releases the scan lock',async()=>{
 let release;const gate=new Promise(r=>release=r);let first=true;
 const scanner=createIpScanner({devices:new Map(),waitMs:1,announce:async()=>{if(first){first=false;await gate;throw Error('fixture send error');}}});
 const pending=scanner.scan('10.0.0.1','10.0.0.1');await assert.rejects(scanner.scan('10.0.0.2','10.0.0.2'),e=>e.status===409);release();await assert.rejects(pending);assert.equal((await scanner.scan('10.0.0.2','10.0.0.2')).scanned,1);
});
test('unicast scan discovers an owned student Agent through a signed TLS heartbeat',{timeout:20000},async t=>{
 const os=require('node:os'),fs=require('node:fs'),path=require('node:path'),dgram=require('node:dgram'),{spawn,execFileSync}=require('node:child_process'),{once}=require('node:events');
 const ip=Object.values(os.networkInterfaces()).flat().find(x=>{try{return x.family==='IPv4'&&!x.internal&&range(x.address,x.address);}catch{return false;}})?.address;
 if(!ip){t.skip('No private IPv4 interface on this test host');return;}
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fbs-m191-')),cert=path.join(dir,'cert.pem'),key=path.join(dir,'key.pem');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-subj','/CN=fixture','-days','1'],{stdio:'ignore'});
 const udp=dgram.createSocket('udp4');await new Promise(r=>udp.bind(0,'0.0.0.0',r));const port=udp.address().port;await new Promise(r=>udp.close(r));
 const previous=[process.env.FBS_TLS_CERT,process.env.FBS_TLS_KEY];process.env.FBS_TLS_CERT=cert;process.env.FBS_TLS_KEY=key;
 const lan=require('../teacher-lan').createTeacherLan({secret:'fixture-m191-only-key',port:0,discoveryPort:port,discoveryEnabled:false});let child;
 try{
  await lan.start();child=spawn(process.execPath,['student-agent.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,FBS_PAIRING_KEY:'fixture-m191-only-key',FBS_DEVICE_ID:'SCAN-FIXTURE',FBS_IDENTITY_FILE:path.join(dir,'identity.json'),FBS_LOCAL_PORT:'0',FBS_DISCOVERY_PORT:String(port)},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Agent UDP startup timed out')),6000);let text='';child.once('error',reject);child.stdout.on('data',c=>{text+=c;if(text.includes('waiting for teacher discovery on UDP')){clearTimeout(timer);resolve();}});});
  const result=await lan.scanIps(ip,ip);assert.equal(result.scanned,1);assert.equal(result.found.length,1);assert.equal(result.found[0].id,'SCAN-FIXTURE');assert.equal(result.found[0].ip,ip);assert.ok(result.found[0].publicKey.includes('PUBLIC KEY'));
 }finally{
  if(child&&child.exitCode===null){const done=once(child,'exit');child.kill();await done;}
  if(lan.server.listening)await lan.stop();for(const[i,n]of ['FBS_TLS_CERT','FBS_TLS_KEY'].entries()){if(previous[i]===undefined)delete process.env[n];else process.env[n]=previous[i];}fs.rmSync(dir,{recursive:true,force:true});
 }
});
