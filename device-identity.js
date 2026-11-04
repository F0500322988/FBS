'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const idPattern=/^[\w.-]{1,64}$/;
function identityFile(){return process.env.FBS_IDENTITY_FILE||path.join(os.homedir(),'.fbs-classroom','device-identity.json');}
function getIdentity(file=identityFile()){
 fs.mkdirSync(path.dirname(file),{recursive:true});
 if(fs.existsSync(file)){
  const obj=JSON.parse(fs.readFileSync(file,'utf8'));
  if(!idPattern.test(obj.id))throw Error('Invalid stored identity');
  return obj;
 }
 const pair=crypto.generateKeyPairSync('ed25519');
 const obj={id:crypto.randomUUID(),publicKey:pair.publicKey.export({type:'spki',format:'pem'}),privateKey:pair.privateKey.export({type:'pkcs8',format:'pem'})};
 fs.writeFileSync(file,JSON.stringify(obj,null,2),{flag:'wx',mode:0o600});return obj;
}
function signMessage(identity,body){
 const timestamp=Date.now(),nonce=crypto.randomBytes(16).toString('hex');
 const data=JSON.stringify({body,timestamp,nonce});
 const signature=crypto.sign(null,Buffer.from(data),identity.privateKey).toString('base64');
 return {body,timestamp,nonce,publicKey:identity.publicKey,signature};
}
function verifyMessage(packet,knownKey,seen=new Set(),now=Date.now()){
 if(!packet||typeof packet.timestamp!=='number'||Math.abs(now-packet.timestamp)>15000||!/^[a-f0-9]{32}$/.test(packet.nonce||''))return false;
 if(seen.has(packet.nonce)||typeof packet.signature!=='string')return false;
 try{
 const pub=crypto.createPublicKey(knownKey);
 if(pub.asymmetricKeyType!=='ed25519')return false;
 const data=JSON.stringify({body:packet.body,timestamp:packet.timestamp,nonce:packet.nonce});
 if(!crypto.verify(null,Buffer.from(data),pub,Buffer.from(packet.signature,'base64')))return false;
 seen.add(packet.nonce);return true;
 }catch{return false;}
}
module.exports={getIdentity,signMessage,verifyMessage};
