'use strict';
const https=require('node:https');
const tls=require('node:tls');
const crypto=require('node:crypto');

function isTrustedCertificate(raw,expected,now=Date.now()){
 try{
  const certificate=new crypto.X509Certificate(raw);
  const from=Date.parse(certificate.validFrom),until=Date.parse(certificate.validTo);
  return Number.isFinite(now)&&Number.isFinite(from)&&Number.isFinite(until)&&now>=from&&now<until
   &&Buffer.isBuffer(expected)&&expected.length===32
   &&crypto.timingSafeEqual(crypto.createHash('sha256').update(certificate.raw).digest(),expected);
 }catch{return false;}
}

// Pin authentication completes BEFORE the agent hands the socket to HTTP.
// This supports administrator-approved self-signed classroom certificates;
// no request headers or body may be sent to a peer with a different certificate.
function pinnedRequest(options,onResponse){
 const {fingerprint,...requestOptions}=options;
 if(typeof fingerprint!=='string'||!/^[a-f0-9]{64}$/i.test(fingerprint))throw Error('Invalid TLS certificate fingerprint');
 const expected=Buffer.from(fingerprint,'hex');
 const agent=new https.Agent({keepAlive:false,maxCachedSessions:0});
 agent.createConnection=(connectionOptions,callback)=>{
  let finished=false;
  const socket=tls.connect({...connectionOptions,rejectUnauthorized:false,minVersion:'TLSv1.2'});
  const complete=(error)=>{
   if(finished)return;
   finished=true;
   socket.setTimeout(0);
   if(error){callback(error);socket.destroy();}
   else callback(null,socket);
  };
  socket.setTimeout(5000,()=>complete(Error('Teacher TLS handshake timed out')));
  socket.once('error',complete);
  socket.once('secureConnect',()=>{
   const certificate=socket.getPeerCertificate(true);
   if(!certificate?.raw||!isTrustedCertificate(certificate.raw,expected))return complete(Error('Teacher TLS certificate mismatch or certificate outside its validity period'));
   complete(null);
  });
  // Deliberately return no socket: https.Agent waits for the verified callback.
 };
 return https.request({...requestOptions,agent},onResponse);
}
module.exports={pinnedRequest,isTrustedCertificate};
