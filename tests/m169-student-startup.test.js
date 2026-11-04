const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

test('real student agent proves local readiness with its token and never grants unrequested control',async()=>{
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'fbs-agent-start-'));
 const token='ab'.repeat(32);
 const child=spawn(process.execPath,['student-agent.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,
  FBS_PAIRING_KEY:'disposable-m169-test-lab-key',FBS_LOCAL_CONTROL_TOKEN:token,
  FBS_LOCAL_PORT:'0',FBS_DISCOVERY_PORT:'0',FBS_IDENTITY_FILE:path.join(temporary,'identity.json')
 },stdio:['ignore','pipe','pipe']});
 try{
  const port=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Student startup timeout')),15000);
   child.once('error',e=>{clearTimeout(timer);reject(e)});
   child.once('exit',code=>{clearTimeout(timer);reject(Error('Student exited '+code))});
   let output='';child.stdout.on('data',data=>{output+=data;const found=output.match(/Optional screen share: http:\/\/127\.0\.0\.1:(\d+)/);if(found){clearTimeout(timer);resolve(Number(found[1]))}});
  });
  const url=`http://127.0.0.1:${port}/control/local`;
  assert.equal((await fetch(url)).status,403);
  assert.equal((await fetch(url,{headers:{'X-FBS-Local-Token':'cd'.repeat(32)}})).status,403);
  assert.equal((await fetch(url,{headers:{'X-FBS-Local-Token':token,Origin:'http://example.invalid'}})).status,403);
  const result=await fetch(url,{headers:{'X-FBS-Local-Token':token}});
  assert.equal(result.status,200);
  const state=await result.json();assert.equal(state.inputEnabled,false);assert.equal(state.session,null);
  assert.equal((await fetch(url,{method:'POST',headers:{'X-FBS-Local-Token':token,'Content-Type':'application/json'},body:JSON.stringify({sessionId:'not-authorized',approved:true})})).status,409);
 }finally{
  if(child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill();await exited;}
  fs.rmSync(temporary,{recursive:true,force:true});
 }
});
