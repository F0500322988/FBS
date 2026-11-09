'use strict';
const https=require('node:https'),fs=require('node:fs'),dgram=require('node:dgram'),crypto=require('node:crypto');
const {localIPv4,signature,safeEqual}=require('./lan');
const {verifyMessage}=require('./device-identity');
const {wrapCommands}=require('./authenticated-preview-transport');
function createTeacherLan({secret,port=4180,discoveryPort=4181,intervalMs=3000,discoveryEnabled=true}={}){
 if(!require('./credential-policy').storedKey(secret))throw Error('FBS_PAIRING_KEY must be 3 to 8 digits (or an existing legacy key)');
 const devices=new Map();
 const frames=new Map();
 const replay=new Map();
 let approvedKeys=new Map();
 let controlLeases=null;
 let controlCommands=null;
 let messageStore=null;
 let broadcastStore=null;
 let pauseStore=null;function setPauseStore(store){pauseStore=store;}
 let assistanceStore=null;function setAssistanceStore(store){assistanceStore=store;}
 let labNameProvider=()=>'';function setLabNameProvider(provider){labNameProvider=provider;}
 let powerStore=null;function setPowerStore(store){powerStore=store;}
 let fileStore=null;
 function setFileStore(store){fileStore=store;}
 function setBroadcastStore(store){broadcastStore=store;}
 function setMessageStore(store){messageStore=store;}
 function setControlCommands(commands){controlCommands=commands;}
 function setControlLeases(leases){controlLeases=leases;}
 function setApprovedKeys(keys){approvedKeys=keys;}
 const certPath=process.env.FBS_TLS_CERT, keyPath=process.env.FBS_TLS_KEY;
 if(!certPath||!keyPath)throw Error('FBS_TLS_CERT and FBS_TLS_KEY are required for encrypted LAN');
 const cert=fs.readFileSync(certPath),key=fs.readFileSync(keyPath);
 const fingerprint=crypto.createHash('sha256').update(new crypto.X509Certificate(cert).raw).digest('hex');
 const server=https.createServer({cert,key,minVersion:'TLSv1.2'},(req,res)=>{
  if(req.method!=='POST'||!['/heartbeat','/frame','/control/poll','/control/ack','/control/stop','/control/commands','/messages/poll','/broadcast/poll','/files/poll','/files/download','/files/ack','/pause/poll','/pause/ack','/assist/poll','/assist/consent','/assist/stop','/assist/receipt','/power/poll','/power/ack'].includes(req.url)){res.writeHead(404);return res.end();}
  if(!safeEqual(req.headers['x-fbs-key'],secret)){res.writeHead(401);return res.end();}
  let chunks=[],bytes=0;req.on('data',c=>{bytes+=c.length;if(bytes>180000){req.destroy();return;}chunks.push(c);});req.on('end',()=>{
   const raw=Buffer.concat(chunks).toString('utf8');
   try{
    const packet=JSON.parse(raw),body=packet.body;
    if(!body||typeof body.id!=='string'||!/^[\w.-]{1,64}$/.test(body.id)||!['win32','darwin','linux'].includes(body.platform))throw Error('invalid');
    const known=approvedKeys.get(body.id);
    if(known && known!==packet.publicKey)throw Error('key mismatch');
    const pub=known||packet.publicKey;
    if(typeof pub!=='string'||pub.length>2048)throw Error('bad key');
    const nonceKey=body.id+':'+packet.nonce;
    for(const [k,t] of replay)if(Date.now()-t>30000)replay.delete(k);
    if(replay.has(nonceKey)||!verifyMessage(packet,pub,new Set()))throw Error('invalid signature');
    replay.set(nonceKey,Date.now());
    const ip=req.socket.remoteAddress?.replace(/^::ffff:/,'')||'';
    if(req.url.startsWith('/power/')){
     const d=devices.get(body.id);if(!known||!d||d.publicKey!==known||d.ip!==ip||Date.now()-d.lastSeen>20000||d.powerSupported!==true||!powerStore)throw Error('not enrolled or incapable');
     const result=req.url==='/power/poll'?{power:powerStore.poll(body.id,known)}:(powerStore.ack(body.id,known,body.requestId,body.state),{acknowledged:true});
     res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify(result));
    }
    if(req.url.startsWith('/assist/')){
     const d=devices.get(body.id);if(!known||!d||d.publicKey!==known||d.ip!==ip||Date.now()-d.lastSeen>20000||!assistanceStore)throw Error('not enrolled');
     let result={acknowledged:true};
     if(req.url==='/assist/poll')result={session:assistanceStore.poll(body.id,known)};
     else if(req.url==='/assist/consent')assistanceStore.decide(body.id,known,body.sessionId,body.approved);
     else if(req.url==='/assist/stop')assistanceStore.release(body.id,known,body.sessionId);
     else assistanceStore.receipt(body.id,known,body.sessionId,body.sequence,body.state);
     res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify(result));
    }
    if(req.url.startsWith('/pause/')){
     const device=devices.get(body.id);
     if(!known||!device||device.publicKey!==known||device.ip!==ip||Date.now()-device.lastSeen>20000||!pauseStore)throw Error('not enrolled');
     const result=req.url==='/pause/poll'?{pause:pauseStore.poll(body.id,known)}:(pauseStore.ack(body.sessionId,body.id,known,body.state),{acknowledged:true});
     res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify(result));
    }
    if(req.url.startsWith('/files/')){
     const device=devices.get(body.id);
     if(!known||!device||device.publicKey!==known||device.ip!==ip||Date.now()-device.lastSeen>20000||!fileStore)throw Error('not enrolled');
     let result;
     if(req.url==='/files/poll')result={files:fileStore.poll(body.id,known)};
     else if(req.url==='/files/download')result=fileStore.download(body.fileId,body.id,known);
     else {fileStore.acknowledge(body.fileId,body.id,known,body.state);result={acknowledged:true};}
     res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify(result));
    }
    if(req.url==='/broadcast/poll'){
     const device=devices.get(body.id);
     if(!known||!device||device.publicKey!==known||device.ip!==ip||Date.now()-device.lastSeen>20000||!broadcastStore)throw Error('not enrolled');
     const broadcast=broadcastStore.poll(body.id,known);
     res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({broadcast}));
    }
    if(req.url==='/messages/poll'){
     const device=devices.get(body.id);
     if(!known||!device||device.publicKey!==known||device.ip!==ip||Date.now()-device.lastSeen>20000||!messageStore)throw Error('not enrolled');
     const messages=messageStore.poll(body.id,known,body.acks||[]);
     res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({messages}));
    }
    if(['/control/poll','/control/ack','/control/stop','/control/commands'].includes(req.url)){
     const device=devices.get(body.id);
     if(!known||!device||device.publicKey!==known||device.ip!==ip||Date.now()-device.lastSeen>20000||!controlLeases)throw Error('not enrolled');
     if(req.url==='/control/commands'){
      const session=controlLeases.pending(body.id);
      const rawCommands=controlCommands?controlCommands.poll(session):[];
      const commands=session?.status==='consented-no-input'?wrapCommands(rawCommands,{secret,deviceId:body.id,sessionId:session.sessionId}):[];
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({commands,executed:false}));
     }
     if(req.url==='/control/poll'){
      const pending=controlLeases.pending(body.id);
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({session:pending,inputEnabled:false}));
     }
     if(req.url==='/control/stop'){
      if(typeof body.sessionId!=='string'||!controlLeases.studentStop(body.id,body.sessionId))throw Error('invalid stop');
      controlCommands?.clear(body.id);
      res.writeHead(204);return res.end();
     }
     if(typeof body.sessionId!=='string'||typeof body.approved!=='boolean'||!controlLeases.acknowledge(body.id,body.sessionId,body.approved))throw Error('invalid acknowledgement');
     res.writeHead(204);return res.end();
    }
    if(req.url==='/frame'){
     const device=devices.get(body.id);
     if(!known||!device||device.publicKey!==known||device.ip!==ip||Date.now()-device.lastSeen>20000||typeof body.jpeg!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(body.jpeg)||body.jpeg.length>170000)throw Error('invalid frame');
     frames.set(body.id,{jpeg:body.jpeg,at:Date.now(),assistanceMonitor:body.assistanceSurface==='monitor'});
    }else{
     if(known && packet.publicKey!==known)throw Error('key mismatch');
     const prior=devices.get(body.id);
     if(prior && prior.publicKey!==packet.publicKey && (!known||known!==packet.publicKey))throw Error('pending key change');
     devices.set(body.id,{id:body.id,platform:body.platform,ip,lastSeen:Date.now(),publicKey:packet.publicKey,assistanceVersion:body.assistanceVersion===2?2:1,assistanceSupported:body.assistanceSupported===true,powerSupported:body.powerSupported===true});
     if(powerStore&&known)try{powerStore.observe(devices.get(body.id),body.wakeInterfaces);}catch{}
    }
    if(req.url==='/heartbeat'){res.setHeader('X-FBS-Approved',known===packet.publicKey?'1':'0');try{res.setHeader('X-FBS-Lab',encodeURIComponent(labNameProvider()));}catch{}}
    res.writeHead(204);res.end();
   }catch{res.writeHead(400);res.end();}
  });
 });
 const udp=dgram.createSocket('udp4');udp.on('error',e=>console.error('Discovery:',e.message));
 let timer,udpStarted=false;
 async function start(){await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'0.0.0.0',()=>{server.off('error',reject);resolve();});});
  if(!discoveryEnabled){console.log('Teacher TLS active; UDP discovery disabled.');return;}
  await new Promise((resolve,reject)=>{udp.once('error',reject);udp.bind(0,()=>{udpStarted=true;udp.off('error',reject);udp.setBroadcast(true);resolve();});});
  const announce=()=>{const payload=JSON.stringify({type:'fbs-teacher-v1',port:server.address().port,fingerprint,nonce:crypto.randomBytes(12).toString('hex'),timestamp:Date.now()});const packet=Buffer.from(JSON.stringify({payload,mac:signature(secret,payload)}));udp.send(packet,discoveryPort,'255.255.255.255');};
  announce();timer=setInterval(announce,intervalMs);console.log('Teacher LAN active:',localIPv4().join(', '));
 }
 async function stop(){clearInterval(timer);await Promise.all([new Promise(resolve=>server.close(resolve)),udpStarted?new Promise(resolve=>udp.close(resolve)):Promise.resolve()]);}
 return {devices,frames,server,start,stop,setApprovedKeys,setControlLeases,setControlCommands,setMessageStore,setBroadcastStore,setFileStore,setPauseStore,setAssistanceStore,setPowerStore,setLabNameProvider};
}
if(require.main===module){const lan=createTeacherLan({secret:process.env.FBS_PAIRING_KEY});lan.start().catch(e=>{console.error(e);process.exitCode=1;});}
module.exports={createTeacherLan};
