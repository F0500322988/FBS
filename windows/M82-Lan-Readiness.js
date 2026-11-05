'use strict';
// Non-invasive connectivity diagnostic: no student enrollment, screen capture or input.
const tls=require('node:tls');
const fs=require('node:fs');
const crypto=require('node:crypto');
const net=require('node:net');
const {isIP}=require('node:net');
const DEFAULT_PORT=4180;
function validFingerprint(value){return typeof value==='string'&&/^[a-fA-F0-9]{64}$/.test(value.replace(/:/g,''));}
function normalizeFingerprint(value){return value.replace(/:/g,'').toLowerCase();}
function validateConfig({host,port=DEFAULT_PORT,fingerprint}={}){
 const errors=[];
 if(typeof host!=='string'||(!isIP(host)&&!(/^[a-zA-Z0-9](?:[a-zA-Z0-9.-]{0,251}[a-zA-Z0-9])?$/.test(host))))errors.push('invalid_teacher_host');
 if(!Number.isInteger(port)||port<1||port>65535)errors.push('invalid_teacher_port');
 if(!validFingerprint(fingerprint))errors.push('missing_or_invalid_certificate_pin');
 return errors;
}
function probe({host,port=DEFAULT_PORT,fingerprint,timeoutMs=3500}={}){
 const errors=validateConfig({host,port,fingerprint});
 if(errors.length)return Promise.resolve({passed:false,checks:errors,connected:false});
 return new Promise(resolve=>{
  let finished=false;
  const done=(result)=>{if(finished)return;finished=true;socket.destroy();resolve(result);};
  const socket=tls.connect({host,port,rejectUnauthorized:false,servername:isIP(host)?undefined:host,timeout:timeoutMs});
  socket.once('secureConnect',()=>{
   const cert=socket.getPeerCertificate(true);
   if(!cert||!cert.raw)return done({passed:false,connected:true,checks:['missing_peer_certificate']});
   const actual=crypto.createHash('sha256').update(cert.raw).digest('hex');
   const matches=crypto.timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(normalizeFingerprint(fingerprint),'hex'));
   const notExpired=Number.isFinite(Date.parse(cert.valid_to))&&Date.parse(cert.valid_to)>Date.now();
   done({passed:matches&&notExpired,connected:true,checks:[...(matches?[]:['certificate_pin_mismatch']),...(notExpired?[]:['certificate_expired'])],certificatePinMatched:matches,certificateNotExpired:notExpired});
  });
  socket.once('timeout',()=>done({passed:false,connected:false,checks:['connection_timeout']}));
  socket.once('error',e=>done({passed:false,connected:false,checks:[['ECONNREFUSED','ENOTFOUND','EHOSTUNREACH','ENETUNREACH'].includes(e.code)?e.code:'tls_connection_failed']}));
 });
}
async function main(args){
 const [host,portString,pin,reportPath]=args;
 const port=Number(portString);
 const result=await probe({host,port,fingerprint:pin});
 const report={stage:'M82',role:'Student',...result,note:'TLS connectivity and certificate pin only. UDP discovery, enrollment, consent, preview and remote input NOT tested.'};
 if(reportPath)fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'w',mode:0o600});
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
 if(!result.passed)process.exitCode=1;
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={validFingerprint,normalizeFingerprint,validateConfig,probe};
