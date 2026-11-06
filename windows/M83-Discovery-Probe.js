'use strict';
// Passive, authenticated UDP discovery check. Never enrolls or controls a student.
const dgram=require('node:dgram');
const fs=require('node:fs');
const crypto=require('node:crypto');
const {signature,safeEqual}=require('../lan');
function inspect(packet,secret,now=Date.now()){
 try{
  if(!Buffer.isBuffer(packet)||packet.length>4096||!require('../credential-policy').storedKey(secret))return {valid:false,reason:'invalid_packet'};
  const outer=JSON.parse(packet.toString('utf8'));
  if(typeof outer.payload!=='string'||typeof outer.mac!=='string'||!/^[0-9a-f]{64}$/i.test(outer.mac))return {valid:false,reason:'invalid_envelope'};
  if(!safeEqual(outer.mac.toLowerCase(),signature(secret,outer.payload)))return {valid:false,reason:'invalid_signature'};
  const data=JSON.parse(outer.payload);
  if(data.type!=='fbs-teacher-v1'||!Number.isInteger(data.port)||data.port<1||data.port>65535||typeof data.fingerprint!=='string'||!/^[a-f0-9]{64}$/i.test(data.fingerprint)||typeof data.nonce!=='string'||!/^[a-f0-9]{24}$/i.test(data.nonce)||!Number.isFinite(data.timestamp)||Math.abs(now-data.timestamp)>15000)return {valid:false,reason:'invalid_announcement'};
  return {valid:true,port:data.port,fingerprint:data.fingerprint.toLowerCase(),nonce:data.nonce,timestamp:data.timestamp};
 }catch{return {valid:false,reason:'malformed_packet'};}
}
function listen({secret,port=4181,timeoutMs=12000,expectedFingerprint}={}){
 if(!require('../credential-policy').storedKey(secret))throw Error('FBS_PAIRING_KEY is required (16+ characters)');
 if(!Number.isInteger(port)||port<1||port>65535||!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>120000)throw Error('invalid port or timeout');
 if(expectedFingerprint && !/^[0-9a-f]{64}$/i.test(expectedFingerprint))throw Error('invalid expected fingerprint');
 return new Promise((resolve,reject)=>{
  const socket=dgram.createSocket('udp4'),seen=new Set(),teachers=new Map();let done=false;
  const finish=(err)=>{if(done)return;done=true;clearTimeout(timer);socket.close();if(err)reject(err);else resolve({stage:'M83',passed:teachers.size>0,teacherCount:teachers.size,teachers:[...teachers.values()],note:'Authenticated UDP broadcast observed only; does not prove student enrollment or UI visibility.'});};
  socket.on('error',finish);
  socket.on('message',(packet,remote)=>{
   const info=inspect(packet,secret);
   if(!info.valid||seen.has(info.nonce)||expectedFingerprint&&info.fingerprint!==expectedFingerprint.toLowerCase())return;
   seen.add(info.nonce);
   const id=crypto.createHash('sha256').update(remote.address+'|'+info.fingerprint).digest('hex').slice(0,16);
   teachers.set(id,{id,address:remote.address,port:info.port,certificateFingerprint:info.fingerprint});
  });
  const timer=setTimeout(()=>finish(),timeoutMs);
  socket.bind(port,'0.0.0.0');
 });
}
async function main(args){
 const [portRaw,timeoutRaw,expectedFingerprint,reportPath]=args;
 const report=await listen({secret:process.env.FBS_PAIRING_KEY,port:portRaw?Number(portRaw):4181,timeoutMs:timeoutRaw?Number(timeoutRaw):12000,expectedFingerprint:expectedFingerprint||undefined});
 if(reportPath)fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{mode:0o600});
 process.stdout.write(JSON.stringify(report,null,2)+'\n');if(!report.passed)process.exitCode=1;
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={inspect,listen};
