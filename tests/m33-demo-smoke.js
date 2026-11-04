'use strict';
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const net=require('node:net');
const path=require('node:path');
const {once}=require('node:events');
(async()=>{
 const port=await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
 const child=spawn(process.execPath,[path.join(__dirname,'../server.js')],{env:{...process.env,FBS_DEMO:'1',FBS_TEACHER_PASSWORD:'m33-demo-only-password',PORT:String(port)},stdio:['ignore','pipe','pipe']});
 let stderr='';child.stderr.on('data',x=>stderr+=x.toString());
 try{
  let ready=false;
  for(let i=0;i<60;i++){
   if(child.exitCode!==null)throw Error('Server exited: '+stderr);
   try{const r=await fetch(`http://127.0.0.1:${port}/api/auth`);if(r.ok){ready=true;break;}}catch{}
   await new Promise(r=>setTimeout(r,100));
  }
  assert.equal(ready,true,'demo server startup');
  const base=`http://127.0.0.1:${port}`;
  assert.equal((await fetch(base+'/api/status')).status,401);
  const login=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:'m33-demo-only-password'})});
  assert.equal(login.status,200);
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const status=await fetch(base+'/api/status',{headers:{cookie}});assert.equal(status.status,200);
  const data=await status.json();assert.equal(data.mode,'demo');assert.equal(data.students.length,21);assert.equal(data.features.remoteControl,false);
  const control=await fetch(base+'/api/control/sessions',{headers:{cookie}});assert.equal(control.status,200);
  const controlData=await control.json();assert.equal(controlData.inputEnabled,false);
  console.log('M33 PASS: authenticated demo HTTP, 21 simulated devices, remote input disabled');
 }finally{child.kill();await Promise.race([once(child,'exit'),new Promise(r=>setTimeout(r,1500))]);}
})().catch(e=>{console.error(e);process.exitCode=1;});
