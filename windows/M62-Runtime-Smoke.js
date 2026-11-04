// M62: launch the real teacher HTTP server in demo mode, test auth and preview-only safety.
'use strict';
const {spawn}=require('node:child_process');
const http=require('node:http');
const net=require('node:net');
const path=require('node:path');
const crypto=require('node:crypto');
const {setTimeout:delay}=require('node:timers/promises');
function freePort(){return new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});}
function request(port,route,options={}){return new Promise((resolve,reject)=>{const body=options.body?JSON.stringify(options.body):null;const req=http.request({hostname:'127.0.0.1',port,path:route,method:options.method||'GET',headers:{...(body?{'content-type':'application/json','content-length':Buffer.byteLength(body)}:{}),...(options.cookie?{cookie:options.cookie}:{})}},res=>{let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>{let data;try{data=JSON.parse(text)}catch{data=text}resolve({status:res.statusCode,headers:res.headers,data})});});req.once('error',reject);req.setTimeout(1500,()=>req.destroy(new Error('request timed out')));req.end(body);});}
async function run(){const port=await freePort();const password='M62-'+crypto.randomBytes(20).toString('hex');const server=spawn(process.execPath,[path.join(__dirname,'..','server.js')],{env:{...process.env,PORT:String(port),FBS_DEMO:'1',FBS_TEACHER_PASSWORD:password},stdio:['ignore','pipe','pipe']});let output='';server.stderr.on('data',c=>output+=c.toString().slice(0,500));const checks=[];const check=(name,ok)=>{checks.push({name,passed:!!ok});if(!ok)throw Error('Failed: '+name)};
try{let ready=false;for(let i=0;i<50;i++){if(server.exitCode!==null)throw Error('Server exited: '+output);try{const r=await request(port,'/api/auth');if(r.status===200){ready=true;break}}catch{}await delay(100)}check('server starts on loopback',ready);
let r=await request(port,'/api/status');check('unauthenticated roster denied',r.status===401);
r=await request(port,'/api/control/sessions');check('unauthenticated sessions denied',r.status===401);
r=await request(port,'/api/login',{method:'POST',body:{password:'wrong'}});check('wrong password rejected',r.status===401);
r=await request(port,'/api/login',{method:'POST',body:{password}});const cookie=(r.headers['set-cookie']||[])[0]?.split(';')[0];check('correct password establishes session',r.status===200&&/^fbs_session=[a-f0-9]{64}$/.test(cookie||''));
r=await request(port,'/api/status',{cookie});check('21 simulated students visible',r.status===200&&r.data.students?.length===21&&r.data.features?.remoteControl===false);
r=await request(port,'/api/control/sessions',{cookie});check('native input remains disabled',r.status===200&&r.data.inputEnabled===false);
r=await request(port,'/api/control/request',{cookie,method:'POST',body:{deviceId:'PC-01'}});check('simulated unapproved device cannot be controlled',r.status===404);
r=await request(port,'/api/frames',{cookie});check('frame endpoint returns expected structure',r.status===200&&Array.isArray(r.data.frames));
r=await request(port,'/api/logout',{cookie,method:'POST',body:{}});check('logout succeeds',r.status===200);
r=await request(port,'/api/status',{cookie});check('logged-out session denied',r.status===401);
return {stage:'M62',passed:true,mode:'local-demo-only',liveInputEnabled:false,checks};
}finally{server.kill();await Promise.race([new Promise(resolve=>server.once('exit',resolve)),delay(1500)]);if(server.exitCode===null)server.kill('SIGKILL');}}
if(require.main===module)run().then(r=>{console.log(JSON.stringify(r,null,2))}).catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={run,freePort,request};
