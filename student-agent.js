'use strict';
const dgram=require('node:dgram'),http=require('node:http'),os=require('node:os');
const {localIPv4,signature,safeEqual}=require('./lan');
const {getIdentity,signMessage}=require('./device-identity');
const identity=getIdentity();
const {authorizedLocalRequest}=require('./local-control-auth');
const {createStudentPreviewTransport}=require('./authenticated-preview-transport');
const {initialState,applyPoll,localClose,confirmStop}=require('./control-session-state');
const {configuredTeacher}=require('./teacher-endpoint');
const {pinnedRequest}=require('./pinned-https');
const fixedTeacher=configuredTeacher();
const localControlToken=process.env.FBS_LOCAL_CONTROL_TOKEN||'';
const secret=process.env.FBS_PAIRING_KEY;
if(!secret||secret.length<16){console.error('FBS_PAIRING_KEY must match the teacher key (at least 16 characters).');process.exit(1);}
const id=(process.env.FBS_DEVICE_ID||os.hostname()).replace(/[^\w.-]/g,'_').slice(0,64);
const port=Number(process.env.FBS_DISCOVERY_PORT||4181);
const udp=dgram.createSocket('udp4');let teacher=fixedTeacher;
let sharing=false;
const inbox=require('./classroom-messages').createStudentInbox();
let messagesBusy=false;
const broadcastReceiver=require('./classroom-broadcast').createBroadcastReceiver();
let broadcastBusy=false;
const filePolicy=require('./classroom-files');let availableFiles=[],filesBusy=false,fileDownloadBusy=false;
const capturePage=`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>FBS Student — مشاركة الشاشة</title><style>body{font:18px system-ui;background:#f3f7ff;color:#152b4e;max-width:650px;margin:60px auto}button{padding:12px 22px;margin:8px;border:0;border-radius:8px;background:#1658ac;color:white;cursor:pointer}#stop{background:#a42a39}</style><h2>FBS Classroom — مشاركة شاشة الطالب</h2><p>المشاركة اختيارية في هذا الإصدار التجريبي. ستظهر نافذة من المتصفح لتحديد الشاشة، ويمكنك الإيقاف في أي وقت. النقل إلى المعلم يستخدم TLS مع التحقق من بصمة شهادته. المشاركة لا تبدأ إلا باختيارك ويمكنك إيقافها في أي وقت.</p><button id="start">بدء مشاركة الشاشة</button><button id="stop">إيقاف المشاركة</button><p id="state">غير مشارك</p><video id="preview" autoplay muted playsinline width="480"></video><script>let stream,timer;const state=document.getElementById('state');async function stop(){clearInterval(timer);if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;state.textContent='تم إيقاف المشاركة'}document.getElementById('stop').onclick=stop;document.getElementById('start').onclick=async()=>{try{await stop();stream=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:1},audio:false});document.getElementById('preview').srcObject=stream;stream.getVideoTracks()[0].onended=stop;state.textContent='الشاشة قيد المشاركة';const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;timer=setInterval(async()=>{if(!stream||!document.getElementById('preview').videoWidth)return;canvas.getContext('2d').drawImage(document.getElementById('preview'),0,0,640,360);try{await fetch('/frame',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jpeg:canvas.toDataURL('image/jpeg',.45)})})}catch{}},1500)}catch(e){state.textContent='لم تبدأ المشاركة: '+e.message}};</script></html>`;
let pendingControl=null;
let previewCommands=[];
let stopReceipt=null;
let controlState=initialState();
let locallyStoppedSession=null;
const previewTransport=createStudentPreviewTransport({secret,deviceId:id});
function signedControl(path,body,onResponse){
 if(!teacher)return;
 const data=JSON.stringify(signMessage(identity,{id,platform:process.platform,...body}));
 const req=pinnedRequest({fingerprint:teacher.fingerprint,host:teacher.host,port:teacher.port,path,method:'POST',timeout:2500,headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data),'X-FBS-Key':secret}},res=>{
  let raw='';res.on('data',c=>{if(raw.length<8192)raw+=c});res.on('end',()=>{if(res.statusCode===200||res.statusCode===204)try{onResponse?.(raw?JSON.parse(raw):{});}catch{}});
 });req.on('error',()=>{});req.on('timeout',()=>req.destroy());req.end(data);
}
function pollPreviewCommands(){signedControl('/control/commands',{},result=>{
 const items=Array.isArray(result.commands)?result.commands:[];
 for(const envelope of items){
 const cmd=previewTransport.accept(envelope,{session:pendingControl,connected:!!teacher,enrolled:true,indicatorVisible:pendingControl?.status==='consented-no-input',studentStopped:pendingControl?.sessionId===locallyStoppedSession});
 if(cmd && cmd.sessionId!==locallyStoppedSession){
  previewCommands.push({sessionId:cmd.sessionId,type:cmd.type,sequence:cmd.sequence,at:Date.now(),x:cmd.x,y:cmd.y,key:cmd.key,description:cmd.type==='pointer-preview'?`Pointer preview (${cmd.x}, ${cmd.y})`:`Key preview (${cmd.key})`});
  if(previewCommands.length>20)previewCommands.shift();
  console.log('[FBS M121 AUTHENTICATED PREVIEW ONLY] command received:',cmd.type,cmd.sequence);
 }
 }
 });}
function pollControl(){
 const requestRevision=controlState.revision;
 signedControl('/control/poll',{},result=>{
  controlState=applyPoll(controlState,result.session,requestRevision);
  pendingControl=controlState.session;
  previewCommands=controlState.previewCommands;
  if(!pendingControl||pendingControl.status!=='consented-no-input')previewTransport.revoke();
 });
}
function localControl(req,res){
 const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
 if(!authorizedLocalRequest(req,localControlToken))return send(403,{error:'Unauthorized local controller'});
 if(req.method==='GET')return send(200,{session:pendingControl,broadcastAvailable:!!broadcastReceiver.snapshot(),unreadMessages:inbox.snapshot().filter(m=>!m.read).length,inputEnabled:false,stopReceipt,previewCommands:pendingControl?.status==='consented-no-input'?previewCommands:[]});
 if(req.method!=='POST')return send(405,{error:'Method not allowed'});
 let raw='';req.on('data',c=>{raw+=c;if(raw.length>1024)req.destroy()});req.on('end',()=>{
  try{
   const body=JSON.parse(raw);
   if(!pendingControl||body.sessionId!==pendingControl.sessionId)return send(409,{error:'No matching session'});
   if(body.stop===true){
    previewTransport.revoke();
    const sessionId=pendingControl.sessionId;
    controlState=localClose(controlState,sessionId,'stop');
    pendingControl=controlState.session;previewCommands=controlState.previewCommands;
    locallyStoppedSession=sessionId;
    stopReceipt=controlState.stopReceipt;
    signedControl('/control/stop',{sessionId},()=>{
      controlState=confirmStop(controlState,sessionId);
      stopReceipt=controlState.stopReceipt;
    });
    return send(202,{submitted:true,confirmed:false,inputEnabled:false});
   }
   if(pendingControl.status!=='pending-native-consent'||typeof body.approved!=='boolean')return send(409,{error:'Not awaiting consent'});
   const sessionId=pendingControl.sessionId;
   if(!body.approved){controlState=localClose(controlState,sessionId,'denied');pendingControl=controlState.session;previewCommands=controlState.previewCommands;}
   signedControl('/control/ack',{sessionId,approved:body.approved});
   send(202,{submitted:true,inputEnabled:false});
  }catch{send(400,{error:'Invalid request'});}
 });
}
function fileRequest(path,body={}){
 return new Promise((resolve,reject)=>{
  if(!teacher)return reject(Error('Teacher unavailable'));
  const endpoint=teacher,data=JSON.stringify(signMessage(identity,{id,platform:process.platform,...body}));
  const request=pinnedRequest({fingerprint:endpoint.fingerprint,host:endpoint.host,port:endpoint.port,path,method:'POST',timeout:5000,headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data),'X-FBS-Key':secret}},res=>{
   let chunks=[],bytes=0;res.on('error',reject);res.on('aborted',()=>reject(Error('Interrupted transfer')));
   res.on('data',c=>{bytes+=c.length;if(bytes>7100000){request.destroy();return;}chunks.push(c);});
   res.on('end',()=>{if(res.statusCode!==200||teacher.host!==endpoint.host||teacher.port!==endpoint.port||teacher.fingerprint!==endpoint.fingerprint)return reject(Error('File unavailable'));try{resolve(JSON.parse(Buffer.concat(chunks).toString()));}catch(e){reject(e);}});
  });request.on('error',reject);request.on('timeout',()=>request.destroy(Error('Transfer timeout')));request.end(data);
 });
}
async function pollFiles(){if(filesBusy)return;filesBusy=true;try{const result=await fileRequest('/files/poll');if(!Array.isArray(result.files)||result.files.length>10)throw Error('Invalid file list');availableFiles=result.files.filter(f=>filePolicy.validName(f.name)&&typeof f.id==='string'&&/^[a-f0-9-]{36}$/.test(f.id)&&Number.isInteger(f.size)&&f.size>0&&f.size<=filePolicy.MAX_BYTES&&/^[a-f0-9]{64}$/.test(f.sha256)&&Number.isFinite(f.expiresAt)&&f.expiresAt>Date.now()&&f.expiresAt<=Date.now()+305000);}catch{availableFiles=[];}finally{filesBusy=false;}}
function localFiles(req,res){
 const reply=(code,body)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
 if(!authorizedLocalRequest(req,localControlToken))return reply(403,{error:'Unauthorized local controller'});
 const active=()=>availableFiles.filter(f=>f.expiresAt>Date.now());
 if(req.method==='GET'&&req.url==='/files/local')return reply(200,{files:active()});
 if(req.method!=='POST'||!['/files/local/download','/files/local/saved'].includes(req.url))return reply(405,{error:'Method not allowed'});
 let chunks=[],bytes=0;req.on('data',c=>{bytes+=c.length;if(bytes>1024){req.destroy();return;}chunks.push(c);});
 req.on('end',async()=>{
  let ownsDownload=false;
  try{
   const body=JSON.parse(Buffer.concat(chunks).toString()),meta=active().find(f=>f.id===body.id);if(!meta)return reply(404,{error:'File unavailable'});
   if(req.url.endsWith('/saved')){await fileRequest('/files/ack',{fileId:meta.id,state:'saved'});return reply(200,{confirmed:true});}
   if(fileDownloadBusy)return reply(429,{error:'Download already active'});fileDownloadBusy=true;ownsDownload=true;
   const result=await fileRequest('/files/download',{fileId:meta.id});if(result.id!==meta.id||result.sha256!==meta.sha256||result.size!==meta.size)throw Error('File metadata changed');
   const data=filePolicy.decodeFile(result.base64,meta.size,meta.sha256);
   if(!active().some(f=>f.id===meta.id))throw Error('File expired or revoked');
   await fileRequest('/files/ack',{fileId:meta.id,state:'downloaded'});
   res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':data.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-FBS-SHA256':meta.sha256});res.end(data);
  }catch{if(!res.headersSent)reply(409,{error:'File transfer failed or unavailable'});}
  finally{if(ownsDownload)fileDownloadBusy=false;}
 });
}

// M178: short-lived classroom overlay; local release never waits for the network.
const pauseReceiver=require('./classroom-pause').createPauseReceiver();let pauseBusy=false;
async function pollPause(){if(pauseBusy)return;pauseBusy=true;const revision=pauseReceiver.revision;try{const result=await fileRequest('/pause/poll');pauseReceiver.accept(result.pause,revision);}catch{pauseReceiver.clear();}finally{pauseBusy=false;}}
function localPause(req,res){
 const reply=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
 if(!authorizedLocalRequest(req,localControlToken))return reply(403,{error:'Unauthorized local controller'});
 if(req.method==='GET')return reply(200,{pause:pauseReceiver.snapshot()});
 if(req.method!=='POST')return reply(405,{error:'Method not allowed'});
 let chunks=[],bytes=0;req.on('data',c=>{bytes+=c.length;if(bytes>1024){req.destroy();return;}chunks.push(c);});req.on('end',async()=>{
  try{const body=JSON.parse(Buffer.concat(chunks).toString());if(!['displayed','released'].includes(body.state))throw Error();
   if(body.state==='released')pauseReceiver.dismiss(body.sessionId);
   else if(pauseReceiver.snapshot()?.sessionId!==body.sessionId)throw Error();
   try{await fileRequest('/pause/ack',{sessionId:body.sessionId,state:body.state});reply(200,{confirmed:true});}catch{reply(202,{confirmed:false});}
  }catch{reply(400,{error:'Invalid screen pause receipt'});}
 });
}

function pollBroadcast(){
 if(!teacher||broadcastBusy)return;
 broadcastBusy=true;const endpoint=teacher;
 const data=JSON.stringify(signMessage(identity,{id,platform:process.platform}));
 const fail=()=>{broadcastBusy=false;broadcastReceiver.clear();};
 const request=pinnedRequest({fingerprint:endpoint.fingerprint,host:endpoint.host,port:endpoint.port,path:'/broadcast/poll',method:'POST',timeout:2500,headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data),'X-FBS-Key':secret}},res=>{
  let chunks=[],bytes=0;
  res.on('error',fail);res.on('aborted',fail);
  res.on('data',c=>{bytes+=c.length;if(bytes>180000){request.destroy();return;}chunks.push(c);});
  res.on('end',()=>{
   broadcastBusy=false;
   if(teacher.host!==endpoint.host||teacher.port!==endpoint.port||teacher.fingerprint!==endpoint.fingerprint||res.statusCode!==200){broadcastReceiver.clear();return;}
   try{broadcastReceiver.accept(JSON.parse(Buffer.concat(chunks).toString()).broadcast);}catch{broadcastReceiver.clear();}
  });
 });
 request.on('error',fail);request.on('timeout',()=>request.destroy());request.end(data);
}
async function pollMessages(){
 if(!teacher||messagesBusy)return;
 messagesBusy=true;const endpoint=teacher,sent=inbox.pending();
 const data=JSON.stringify(signMessage(identity,{id,platform:process.platform,acks:sent}));
 const request=pinnedRequest({fingerprint:endpoint.fingerprint,host:endpoint.host,port:endpoint.port,path:'/messages/poll',method:'POST',timeout:2500,headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data),'X-FBS-Key':secret}},res=>{
  let chunks=[],bytes=0;
  res.on('data',c=>{bytes+=c.length;if(bytes>100000){request.destroy();return;}chunks.push(c)});
  res.on('end',()=>{
   messagesBusy=false;
   if(teacher!==endpoint){inbox.clear();return;}
   if(res.statusCode!==200){inbox.clear();return;}
   try{const body=JSON.parse(Buffer.concat(chunks).toString());inbox.accept(body.messages);inbox.confirm(sent);}catch{inbox.clear();}
  });
 });
 request.on('error',()=>{messagesBusy=false;inbox.clear();});request.on('timeout',()=>request.destroy());request.end(data);
}
function localMessages(req,res){
 const reply=(code,body)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
 if(!authorizedLocalRequest(req,localControlToken))return reply(403,{error:'Unauthorized local controller'});
 if(req.url==='/messages/local'&&req.method==='GET')return reply(200,{messages:inbox.snapshot()});
 if(req.url!=='/messages/local/read'||req.method!=='POST')return reply(405,{error:'Method not allowed'});
 let chunks=[],bytes=0;req.on('data',c=>{bytes+=c.length;if(bytes>1024){req.destroy();return;}chunks.push(c)});
 req.on('end',()=>{try{const body=JSON.parse(Buffer.concat(chunks).toString());if(!inbox.read(body.id))return reply(404,{error:'Message unavailable'});reply(202,{read:true,confirmedByTeacher:false});}catch{reply(400,{error:'Invalid request'});}});
}
const localServer=http.createServer((req,res)=>{
 if(req.url==='/pause/local')return localPause(req,res);
 if(['/files/local','/files/local/download','/files/local/saved'].includes(req.url))return localFiles(req,res);
 if(req.url==='/broadcast/local'){
  if(!authorizedLocalRequest(req,localControlToken)){res.writeHead(403);return res.end();}
  if(req.method!=='GET'){res.writeHead(405);return res.end();}
  res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(JSON.stringify({broadcast:broadcastReceiver.snapshot()}));
 }
 if(req.url==='/messages/local'||req.url==='/messages/local/read')return localMessages(req,res);
 if(req.url==='/control/local')return localControl(req,res);
if(req.method==='GET'&&req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(capturePage)}if(req.method==='POST'&&req.url==='/frame'){let chunks=[],size=0;req.on('data',c=>{size+=c.length;if(size>175000){req.destroy();return;}chunks.push(c)});return req.on('end',()=>{try{const body=JSON.parse(Buffer.concat(chunks).toString());if(!teacher||typeof body.jpeg!=='string'||body.jpeg.length>170000)throw Error('no teacher');const data=JSON.stringify(signMessage(identity,{id,platform:process.platform,jpeg:body.jpeg}));const r=pinnedRequest({fingerprint:teacher.fingerprint,host:teacher.host,port:teacher.port,path:'/frame',method:'POST',timeout:2500,headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data),'X-FBS-Key':secret}},x=>x.resume());r.on('error',()=>{});r.on('timeout',()=>r.destroy());r.end(data);res.writeHead(202);res.end()}catch{res.writeHead(400);res.end()}})}res.writeHead(404);res.end()});
const localPort=Number(process.env.FBS_LOCAL_PORT||4190);
if(!Number.isInteger(localPort)||localPort<0||localPort>65535)throw Error('Invalid FBS_LOCAL_PORT');
localServer.listen(localPort,'127.0.0.1',()=>console.log('Optional screen share: http://127.0.0.1:'+localServer.address().port));
function heartbeat(){if(!teacher)return;const data=JSON.stringify(signMessage(identity,{id,platform:process.platform,addresses:localIPv4()}));const req=pinnedRequest({fingerprint:teacher.fingerprint,host:teacher.host,port:teacher.port,path:'/heartbeat',method:'POST',timeout:3000,headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data),'X-FBS-Key':secret}},res=>res.resume());req.on('error',()=>{});req.on('timeout',()=>req.destroy());req.end(data);}
udp.on('message',(buf,remote)=>{try{const msg=JSON.parse(buf.toString());if(!safeEqual(signature(secret,msg.payload),msg.mac))return;const p=JSON.parse(msg.payload);if(p.type!=='fbs-teacher-v1'||Math.abs(Date.now()-p.timestamp)>10000||!Number.isInteger(p.port)||p.port<1||p.port>65535)return;if(!/^[a-f0-9]{64}$/.test(p.fingerprint))return;teacher={host:remote.address,port:p.port,fingerprint:p.fingerprint};heartbeat();}catch{}});
if(fixedTeacher){console.log('Student using configured teacher endpoint; UDP discovery disabled.');heartbeat();}
else udp.bind(port,'0.0.0.0',()=>console.log('Student agent',id,'IP:',localIPv4().join(', '),'waiting for teacher discovery on UDP',port));
setInterval(heartbeat,5000);
setInterval(pollControl,2000);

setInterval(pollPreviewCommands,2000);

setInterval(pollMessages,2000);

setInterval(pollBroadcast,1000);

setInterval(pollFiles,2000);

setInterval(pollPause,1000);
