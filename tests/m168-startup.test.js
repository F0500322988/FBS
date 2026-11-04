const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const path=require('node:path');

test('readiness response identifies the launched server instance and still requires teacher login',async()=>{
 const startupId='8ab27896ea324be2988dfe4b71ec653d';
 const child=spawn(process.execPath,['-e',"const {server}=require('./server');server.listen(0,'127.0.0.1',()=>console.log(server.address().port));"],{
  cwd:path.join(__dirname,'..'),env:{...process.env,FBS_DEMO:'1',FBS_TEACHER_PASSWORD:'disposable-test-password',FBS_STARTUP_ID:startupId},stdio:['ignore','pipe','pipe']
 });
 try{
  const port=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Server startup timed out')),10000);
   child.once('error',error=>{clearTimeout(timer);reject(error);});
   child.once('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code));});
   let output='';child.stdout.on('data',chunk=>{output+=chunk;if(output.includes('\n')){clearTimeout(timer);resolve(Number(output.trim()));}});
  });
  const response=await fetch(`http://127.0.0.1:${port}/api/auth`);
  const auth=await response.json();
  assert.equal(response.status,200);
  assert.equal(auth.startupId,startupId);
  assert.equal(auth.required,true);
  assert.equal(auth.authenticated,false);
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/status`)).status,401);
 }finally{if(child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill();await exited;}}
});
