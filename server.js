'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {createTeacherLan} = require('./teacher-lan');
const {createEnrollment} = require('./enrollment');
const {createControlLeases} = require('./control-lease');
const {createControlCommands} = require('./control-commands');
const PORT = Number(process.env.PORT || 4177);
const HOST = '127.0.0.1'; // loopback only: demo is not a LAN-ready security implementation
const students = new Map();
const labSettings=require('./lab-settings').createLabSettings(process.env.FBS_LAB_SETTINGS_FILE||path.join(path.dirname(process.env.FBS_ENROLLMENT_FILE||path.join(__dirname,'data','enrollment.json')),'lab-settings.json'));
const labProfiles=require('./lab-profiles').createLabProfiles(process.env.FBS_LAB_PROFILES_FILE||path.join(path.dirname(process.env.FBS_LAB_SETTINGS_FILE||process.env.FBS_ENROLLMENT_FILE||path.join(__dirname,'data','enrollment.json')),'lab-profiles.json'));
function labStatus(){try{const s=labSettings.snapshot();return {name:s.name,platform:s.platform,capacity:40,settingsAvailable:true};}catch{return {name:'المعمل — تعذر قراءة الإعدادات',capacity:40,settingsAvailable:false};}}
const demo = process.env.FBS_DEMO === '1';
const lan = !demo && process.env.FBS_PAIRING_KEY ? createTeacherLan({secret:process.env.FBS_PAIRING_KEY,port:Number(process.env.FBS_AGENT_PORT||4180),discoveryPort:Number(process.env.FBS_DISCOVERY_PORT||4181),discoveryEnabled:process.env.FBS_DISCOVERY_ENABLED!=='0'}) : null;
if(lan)lan.setLabNameProvider(()=>labStatus().name);
if (demo) for(let i=1;i<=21;i++) students.set(`PC-${String(i).padStart(2,'0')}`, {id:`PC-${String(i).padStart(2,'0')}`,online:i!==17,os:'Windows 11',lastSeen:Date.now()- (i===17?120000:Math.round(Math.random()*9000)), demo:true});
const publicDir = path.join(__dirname,'public');
const teacherPassword=process.env.FBS_TEACHER_PASSWORD||'';
const startupId=process.env.FBS_STARTUP_ID||undefined;
const sessions=new Map();
const enrollment=createEnrollment(process.env.FBS_ENROLLMENT_FILE||path.join(__dirname,'data','enrollment.json'));
const leases=createControlLeases();
const commands=createControlCommands();
const messageStore=require('./classroom-messages').createMessageStore();
if(lan)lan.setMessageStore(messageStore);
const broadcastStore=require('./classroom-broadcast').createBroadcastStore();
if(lan)lan.setBroadcastStore(broadcastStore);
const fileStore=require('./classroom-files').createFileStore();if(lan)lan.setFileStore(fileStore);
const pauseStore=require('./classroom-pause').createPauseStore();if(lan)lan.setPauseStore(pauseStore);
const assistanceStore=require('./classroom-assistance').createAssistanceStore();if(lan)lan.setAssistanceStore(assistanceStore);
const powerStore=require('./classroom-power').createPowerStore({registryFile:process.env.FBS_POWER_FILE||path.join(path.dirname(process.env.FBS_ENROLLMENT_FILE||path.join(__dirname,'data','enrollment.json')),'wake-devices.json'),getKey:id=>enrollment.keys.get(id)});if(lan)lan.setPowerStore(powerStore);
const controlSessions=leases.sessions;
if(lan){lan.setApprovedKeys(enrollment.keys);lan.setControlLeases(leases);lan.setControlCommands(commands);}
const controlAudit=leases.audit;
function teacherOriginAllowed(req){return !req.headers.origin||req.headers.origin===`http://${HOST}:${PORT}`;}

function constantTimeEqual(a,b){
 const aa=crypto.createHash('sha256').update(String(a)).digest();
 const bb=crypto.createHash('sha256').update(String(b)).digest();
 return crypto.timingSafeEqual(aa,bb);
}
function isAuthenticated(req){
 if(!teacherPassword)return true; // test/demo compatibility; live startup requires a password
 const cookie=(req.headers.cookie||'').match(/(?:^|;\s*)fbs_session=([a-f0-9]{64})(?:;|$)/);
 const expiry=cookie&&sessions.get(cookie[1]);
 return Boolean(expiry&&expiry>Date.now());
}
function readJson(req,maxBytes=4096){
 return new Promise((resolve,reject)=>{
  let chunks=[],n=0;req.on('data',c=>{n+=c.length;if(n>maxBytes){reject(Error('Too large'));req.destroy();return;}chunks.push(c);});
  req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch(e){reject(e);}});req.on('error',reject);
 });
}

function send(res,status,body,type='application/json; charset=utf-8') {res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"});res.end(typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body));}
setInterval(()=>leases.cleanup(),5000).unref();
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,`http://${HOST}:${PORT}`);
 if(url.pathname.startsWith('/api/enrollment/')){
  if(!isAuthenticated(req))return send(res,401,{error:'Teacher login required'});
  if(req.method!=='GET'&&!teacherOriginAllowed(req))return send(res,403,{error:'Origin rejected'});
  if(req.method==='GET'&&url.pathname==='/api/enrollment/devices'){
   return send(res,200,{devices:[...(lan?.devices||new Map()).values()].map(x=>({...x,approved:enrollment.approved.has(x.id)&&enrollment.keys.get(x.id)===x.publicKey,online:Date.now()-x.lastSeen<20000})),approved:[...enrollment.approved]});
  }
  if(req.method==='POST'&&['/api/enrollment/approve','/api/enrollment/revoke'].includes(url.pathname)){
   return readJson(req).then(body=>{
    const id=String(body.deviceId||'');if(!/^[\w.-]{1,64}$/.test(id))return send(res,400,{error:'Invalid id'});
    if(url.pathname.endsWith('/approve')){
     if(!lan?.devices.has(id))return send(res,404,{error:'Device not discovered'});
     const publicKey=lan.devices.get(id).publicKey;
     if(!publicKey)return send(res,409,{error:'Device has no verified public key'});
     enrollment.approve(id,publicKey);
    }else{enrollment.revoke(id);try{powerStore.revoke(id);}catch{}messageStore.revoke(id);broadcastStore.revoke(id);fileStore.revoke(id);pauseStore.revoke(id);assistanceStore.revoke(id);leases.cancel(id);commands.clear(id);lan?.frames.delete(id);}
    return send(res,200,{ok:true,deviceId:id,approved:enrollment.approved.has(id)});
   }).catch(()=>{if(!res.headersSent)send(res,400,{error:'Invalid request'});});
  }
  return send(res,404,{error:'Unknown enrollment operation'});
 }

 if(req.method==='POST'&&url.pathname==='/api/login'){
  if(!teacherPassword)return send(res,403,{error:'Login is not configured'});
  if(req.headers.origin && req.headers.origin!==`http://${HOST}:${PORT}`)return send(res,403,{error:'Origin rejected'});
  return readJson(req).then(body=>{
   if(!constantTimeEqual(body.password||'',teacherPassword))return send(res,401,{error:'Invalid credentials'});
   const token=crypto.randomBytes(32).toString('hex');sessions.set(token,Date.now()+8*60*60*1000);
   res.setHeader('Set-Cookie',`fbs_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);
   send(res,200,{ok:true});
  }).catch(()=>{if(!res.headersSent)send(res,400,{error:'Invalid request'});});
 }
 if(req.method==='POST'&&url.pathname==='/api/logout'){
  const cookie=(req.headers.cookie||'').match(/(?:^|;\s*)fbs_session=([a-f0-9]{64})(?:;|$)/);
  if(cookie)sessions.delete(cookie[1]);
  res.setHeader('Set-Cookie','fbs_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  return send(res,200,{ok:true});
 }
 if(url.pathname.startsWith('/api/control/')){
  if(!isAuthenticated(req))return send(res,401,{error:'Teacher login required'});
  if(req.method!=='GET'&&!teacherOriginAllowed(req))return send(res,403,{error:'Origin rejected'});
  if(req.method==='GET'&&url.pathname==='/api/control/sessions'){
   return send(res,200,{sessions:[...controlSessions.values()],audit:controlAudit.slice(-30),inputEnabled:false});
  }
  if(req.method==='POST'&&url.pathname==='/api/control/request'){
   return readJson(req).then(body=>{
    const id=String(body.deviceId||'');
    const device=lan?.devices.get(id);
    if(!device||(!enrollment.approved.has(id)||enrollment.keys.get(id)!==device.publicKey)||Date.now()-device.lastSeen>=20000)return send(res,404,{error:'Online device not found'});
    if(controlSessions.has(id))return send(res,409,{error:'Session already requested'});
    const session=leases.request(id);
    return send(res,202,{session,inputEnabled:false});
   }).catch(()=>{if(!res.headersSent)send(res,400,{error:'Invalid request'});});
  }
  if(req.method==='POST'&&url.pathname==='/api/control/cancel'){
   return readJson(req).then(body=>{
    const id=String(body.deviceId||'');if(!controlSessions.has(id))return send(res,404,{error:'Session not found'});
    leases.cancel(id);commands.clear(id);return send(res,200,{ok:true});
   }).catch(()=>{if(!res.headersSent)send(res,400,{error:'Invalid request'});});
  }
  if(req.method==='POST'&&url.pathname==='/api/control/command'){
   return readJson(req,1024).then(body=>{
    const id=String(body.deviceId||'');
    const device=lan?.devices.get(id);
    if(!device||!enrollment.approved.has(id)||enrollment.keys.get(id)!==device.publicKey||Date.now()-device.lastSeen>=20000)return send(res,404,{error:'Device unavailable'});
    const session=leases.pending(id);
    if(!session||session.sessionId!==body.sessionId)return send(res,409,{error:'Invalid session'});
    const result=commands.submit(session,body.command);
    return send(res,result.ok?202:400,result);
   }).catch(()=>{if(!res.headersSent)send(res,400,{error:'Invalid request'});});
  }
  return send(res,404,{error:'Unknown control operation'});
 }
 if(['/api/broadcast','/api/broadcast/start','/api/broadcast/frame','/api/broadcast/stop'].includes(url.pathname)){
  if(!isAuthenticated(req))return send(res,401,{error:'Teacher login required'});
  if(url.pathname==='/api/broadcast'&&req.method==='GET')return send(res,200,broadcastStore.state());
  if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
  if(!teacherOriginAllowed(req))return send(res,403,{error:'Origin rejected'});
  return readJson(req,url.pathname.endsWith('/frame')?175000:8000).then(body=>{
   if(!lan)return send(res,409,{error:'Live teacher connection required'});
   try{
    if(url.pathname.endsWith('/start')){
     if(!Array.isArray(body.deviceIds)||!body.deviceIds.length||body.deviceIds.length>40||new Set(body.deviceIds).size!==body.deviceIds.length)return send(res,400,{error:'Select 1 to 40 devices'});
     const targets=body.deviceIds.map(id=>lan.devices.get(id));
     if(targets.some(d=>!d||Date.now()-d.lastSeen>20000||!enrollment.approved.has(d.id)||enrollment.keys.get(d.id)!==d.publicKey))return send(res,409,{error:'Recipients must be online and approved'});
     return send(res,201,broadcastStore.start(targets));
    }
    if(url.pathname.endsWith('/frame'))return send(res,202,broadcastStore.publish(body));
    if(url.pathname.endsWith('/stop'))return send(res,broadcastStore.stop(body.sessionId)?200:409,broadcastStore.state());
    return send(res,404,{error:'Unknown broadcast operation'});
   }catch(e){return send(res,409,{error:e.message});}
  }).catch(()=>send(res,400,{error:'Invalid broadcast request'}));
 }
 if(['/api/power','/api/power/start','/api/power/wake'].includes(url.pathname)){
  if(!isAuthenticated(req))return send(res,401,{error:'Teacher login required'});
  if(req.method==='GET'&&url.pathname==='/api/power'){try{return send(res,200,powerStore.state());}catch{return send(res,503,{error:'Power inventory unavailable'});}}
  if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});if(!teacherOriginAllowed(req))return send(res,403,{error:'Origin rejected'});
  return readJson(req).then(async b=>{try{if(b.confirmed!==true||!Array.isArray(b.deviceIds)||!b.deviceIds.length||b.deviceIds.length>40||new Set(b.deviceIds).size!==b.deviceIds.length)throw Error('Explicit teacher confirmation and unique recipients required');
   if(url.pathname.endsWith('/wake'))return send(res,200,await powerStore.wake(b.deviceIds));
   const devices=b.deviceIds.map(id=>{const d=lan?.devices.get(id);if(!d||Date.now()-d.lastSeen>20000||enrollment.keys.get(id)!==d.publicKey)throw Error('Approved online recipient required');return d;});return send(res,202,powerStore.start(b.action,devices));
  }catch(e){return send(res,e.status===503?503:409,{error:'Power request unavailable; verify capability, inventory and current status'});}}).catch(()=>{if(!res.headersSent)send(res,400,{error:'Invalid power request'});});
 }
 if(['/api/assist','/api/assist/start','/api/assist/keepalive','/api/assist/stop','/api/assist/command'].includes(url.pathname)){
  if(!isAuthenticated(req))return send(res,401,{error:'Teacher login required'});
  if(req.method==='GET'&&url.pathname==='/api/assist')return send(res,200,assistanceStore.state());
  if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
  if(!teacherOriginAllowed(req))return send(res,403,{error:'Origin rejected'});
  return readJson(req).then(body=>{try{
   if(url.pathname.endsWith('/start')){const d=lan?.devices.get(body.deviceId);if(!d||Date.now()-d.lastSeen>20000||!enrollment.approved.has(d.id)||enrollment.keys.get(d.id)!==d.publicKey)return send(res,409,{error:'Approved online device required'});return send(res,201,assistanceStore.start(d));}
   if(url.pathname.endsWith('/keepalive'))return send(res,200,assistanceStore.touch(body.sessionId,body.controlToken));
   if(url.pathname.endsWith('/stop'))return send(res,200,assistanceStore.stop(body.sessionId));
   if(url.pathname.endsWith('/command')){const d=assistanceStore.state().deviceId,device=lan?.devices.get(d),frame=lan?.frames.get(d);const fresh=!!frame&&frame.assistanceMonitor===true&&Date.now()-frame.at>=0&&Date.now()-frame.at<3500&&device&&Date.now()-device.lastSeen<20000&&enrollment.keys.get(d)===device.publicKey;return send(res,202,assistanceStore.submit(body.sessionId,body.controlToken,body.action,fresh));}
   return send(res,404,{error:'Unknown operation'});
  }catch{return send(res,409,{error:'Assistance unavailable, stale screen or consent missing'});}}).catch(()=>{if(!res.headersSent)send(res,400,{error:'Invalid assistance request'});});
 }
 if(['/api/pause','/api/pause/start','/api/pause/keepalive','/api/pause/stop'].includes(url.pathname)){
  if(!isAuthenticated(req))return send(res,401,{error:'Teacher login required'});
  if(req.method==='GET'&&url.pathname==='/api/pause')return send(res,200,pauseStore.state());
  if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
  if(!teacherOriginAllowed(req))return send(res,403,{error:'Origin rejected'});
  return readJson(req).then(body=>{
   try{
    if(url.pathname.endsWith('/start')){
     if(!lan)return send(res,409,{error:'Live connection required'});
     if(!Array.isArray(body.deviceIds)||!body.deviceIds.length||body.deviceIds.length>40||new Set(body.deviceIds).size!==body.deviceIds.length)return send(res,400,{error:'Invalid recipients'});
     const targets=body.deviceIds.map(id=>lan.devices.get(id));
     if(targets.some(d=>!d||Date.now()-d.lastSeen>20000||!enrollment.approved.has(d.id)||enrollment.keys.get(d.id)!==d.publicKey))return send(res,409,{error:'Recipients must be online and approved'});
     return send(res,201,pauseStore.start(targets,body.seconds));
    }
    if(url.pathname.endsWith('/keepalive'))return send(res,200,pauseStore.touch(body.sessionId));
    if(url.pathname.endsWith('/stop'))return send(res,200,pauseStore.stop(body.sessionId));
    return send(res,404,{error:'Unknown pause operation'});
   }catch{return send(res,409,{error:'Screen pause unavailable or invalid'});}
  }).catch(()=>{if(!res.headersSent)send(res,400,{error:'Invalid screen pause request'});});
 }
 if(url.pathname==='/api/lab-profiles'){
  if(!isAuthenticated(req))return send(res,401,{error:'Teacher login required'});
  if(req.method==='GET'){try{return send(res,200,labProfiles.snapshot());}catch(e){return send(res,e.status||503,{error:e.message});}}
  if(req.method!=='PUT')return send(res,405,{error:'Method not allowed'});
  if(!teacherOriginAllowed(req))return send(res,403,{error:'Origin rejected'});
  return readJson(req,1048576).then(body=>{try{return send(res,200,labProfiles.save(body));}catch(e){return send(res,e.status||503,{error:e.message});}}).catch(()=>{if(!res.headersSent)send(res,400,{error:'Invalid lab profile request'});});
 }
 if(url.pathname==='/api/lab-settings'){
  if(!isAuthenticated(req))return send(res,401,{error:'Teacher login required'});
  if(req.method==='GET'){try{return send(res,200,labSettings.snapshot());}catch(e){return send(res,e.status||503,{error:e.message});}}
  if(req.method!=='PUT')return send(res,405,{error:'Method not allowed'});
  if(!teacherOriginAllowed(req))return send(res,403,{error:'Origin rejected'});
  return readJson(req,65536).then(body=>{try{return send(res,200,labSettings.save(body));}catch(e){return send(res,e.status||503,{error:e.message});}}).catch(()=>{if(!res.headersSent)send(res,400,{error:'Invalid lab settings request'});});
 }
 if(url.pathname==='/api/files'){
  if(!isAuthenticated(req))return send(res,401,{error:'Teacher login required'});
  if(req.method==='GET')return send(res,200,{files:fileStore.snapshot()});
  if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
  if(!teacherOriginAllowed(req))return send(res,403,{error:'Origin rejected'});
  return readJson(req,7100000).then(body=>{
   if(!lan)return send(res,409,{error:'Live connection required'});
   if(!Array.isArray(body.deviceIds)||!body.deviceIds.length||body.deviceIds.length>40||new Set(body.deviceIds).size!==body.deviceIds.length)return send(res,400,{error:'Invalid recipients'});
   const targets=body.deviceIds.map(id=>lan.devices.get(id));
   if(targets.some(d=>!d||Date.now()-d.lastSeen>20000||!enrollment.approved.has(d.id)||enrollment.keys.get(d.id)!==d.publicKey))return send(res,409,{error:'Recipients must be online and approved'});
   try{return send(res,202,fileStore.create(body.name,body.base64,targets));}catch(e){return send(res,e.message==='File queue full'?429:400,{error:e.message});}
  }).catch(()=>send(res,400,{error:'Invalid file request'}));
 }
 if(url.pathname==='/api/messages'){
  if(!isAuthenticated(req))return send(res,401,{error:'Teacher login required'});
  if(req.method==='GET')return send(res,200,{messages:messageStore.snapshot()});
  if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
  if(!teacherOriginAllowed(req))return send(res,403,{error:'Origin rejected'});
  return readJson(req,16000).then(body=>{
   if(!lan)return send(res,409,{error:'Live teacher connection required'});
   if(!Array.isArray(body.deviceIds)||body.deviceIds.length<1||body.deviceIds.length>40||new Set(body.deviceIds).size!==body.deviceIds.length)return send(res,400,{error:'Select 1 to 40 devices'});
   const targets=body.deviceIds.map(id=>lan.devices.get(id));
   if(targets.some(d=>!d||Date.now()-d.lastSeen>20000||!enrollment.approved.has(d.id)||enrollment.keys.get(d.id)!==d.publicKey))return send(res,409,{error:'Recipients must be online and approved'});
   try{const id=messageStore.create(body.text,targets);return send(res,202,{id,status:'queued'});}catch(e){return send(res,e.message==='Message queue full'?429:400,{error:e.message});}
  }).catch(()=>send(res,400,{error:'Invalid message request'}));
 }
 if(url.pathname==='/api/auth')return send(res,200,{required:!!teacherPassword,authenticated:isAuthenticated(req),startupId});
 if((url.pathname==='/api/status'||url.pathname==='/api/frames')&&!isAuthenticated(req))return send(res,401,{error:'Teacher login required'});
 if(req.method==='GET' && url.pathname==='/api/status') return send(res,200,{lab:labStatus(),mode:demo?'demo':lan?'live':'unconfigured',students:[...(demo?students:lan?lan.devices:new Map()).values()].map(s=>({...s,online:s.demo?s.online:Date.now()-s.lastSeen<20000,approved:enrollment.approved.has(s.id)&&enrollment.keys.get(s.id)===s.publicKey})),features:{screenView:true,remoteControl:false,screenBroadcast:true,fileTransfer:true,messages:true,labManagement:true,screenPause:true,limitedAssistance:true,consentedDesktopControl:true,localConfirmedSystemLock:true,powerManagement:true,managedBroadcast:true}});
 if(req.method==='GET' && url.pathname==='/api/frames') return send(res,200,{frames:lan?[...lan.frames.entries()].filter(([id,v])=>Date.now()-v.at<5000&&lan.devices.has(id)&&enrollment.approved.has(id)&&enrollment.keys.get(id)===lan.devices.get(id).publicKey).map(([id,v])=>({id,jpeg:v.jpeg,at:v.at,assistanceMonitor:v.assistanceMonitor===true})):[]});
 if(req.method==='GET' && (url.pathname==='/' || url.pathname==='/app.js' || url.pathname==='/style.css' || url.pathname==='/reference-theme.css' || /^\/m1(?:0[5-9]|1[0-4])-[a-z-]+\.js$/.test(url.pathname))) {
  const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
  return fs.readFile(path.join(publicDir,file),(err,data)=>err?send(res,404,{error:'Not found'}):send(res,200,data,file.endsWith('.js')?'text/javascript; charset=utf-8':{'index.html':'text/html; charset=utf-8','style.css':'text/css; charset=utf-8','reference-theme.css':'text/css; charset=utf-8'}[file]));
 }
 send(res,404,{error:'Not found'});
});
if(require.main===module){
 if(!demo&&(!teacherPassword||teacherPassword.length<12)){console.error('Set FBS_TEACHER_PASSWORD to at least 12 characters for live mode.');process.exit(1);}
 if(!demo&&!lan){console.error('Set FBS_PAIRING_KEY (minimum 16 characters) before starting live mode. Use FBS_DEMO=1 for simulated devices.');process.exit(1);}
 server.listen(PORT,HOST,async()=>{console.log(`FBS Classroom: http://${HOST}:${PORT} (${demo?'demo':'live'} mode)`);if(lan)try{await lan.start();}catch(e){console.error('LAN startup failed:',e.message);process.exit(1);}});
}
module.exports={server,lan};
