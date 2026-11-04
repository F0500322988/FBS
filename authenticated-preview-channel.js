'use strict';
// M120: authenticated preview envelopes only. Does not perform or authorize native input.
const crypto = require('node:crypto');
const {createControlCommands} = require('./control-commands');
const MAX_AGE_MS=10000;
function canonical(p){return JSON.stringify([p.teacherId,p.deviceId,p.sessionId,p.sequence,p.type,p.at,p.x??null,p.y??null,p.key??null]);}
function validShape(p){
 if(!p||typeof p!=='object'||Array.isArray(p))return false;
 if(!['teacherId','deviceId','sessionId'].every(k=>typeof p[k]==='string'&&p[k].length>0&&p[k].length<=128))return false;
 if(!Number.isSafeInteger(p.sequence)||p.sequence<1||!Number.isSafeInteger(p.at)||p.at<0)return false;
 if(p.type==='pointer-preview')return Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.y>=0&&p.x<=10000&&p.y<=10000&&p.key===undefined;
 if(p.type==='key-preview')return typeof p.key==='string'&&/^[A-Za-z0-9]$/.test(p.key)&&p.x===undefined&&p.y===undefined;
 return false;
}
function signPreview(payload,key){if(!validShape(payload)||!Buffer.isBuffer(key)||key.length<32)throw Error('Invalid preview envelope or key');return crypto.createHmac('sha256',key).update(canonical(payload)).digest('hex');}
function createAuthenticatedPreviewVerifier({key,teacherId,deviceId,sessionId,clock=Date.now}={}){
 if(!Buffer.isBuffer(key)||key.length<32||![teacherId,deviceId,sessionId].every(v=>typeof v==='string'&&v.length>0))throw Error('Invalid binding');
 let lastSequence=0,stopped=false;
 return {
  verify(payload,mac,{connected=false,enrolled=false,indicatorVisible=false,studentStopped=false}={}){
   if(stopped||!connected||!enrolled||!indicatorVisible||studentStopped){stopped=true;return false;}
   if(!validShape(payload)||payload.teacherId!==teacherId||payload.deviceId!==deviceId||payload.sessionId!==sessionId||payload.sequence<=lastSequence||Math.abs(clock()-payload.at)>MAX_AGE_MS||typeof mac!=='string'||!/^[a-f0-9]{64}$/i.test(mac))return false;
   const expected=signPreview(payload,key);
   if(!crypto.timingSafeEqual(Buffer.from(mac,'hex'),Buffer.from(expected,'hex')))return false;
   lastSequence=payload.sequence;return true;
  },
  revoke(){stopped=true;},
  get nativeInputEnabled(){return false;},
  get revoked(){return stopped;}
 };
}
module.exports={signPreview,createAuthenticatedPreviewVerifier,validShape,MAX_AGE_MS};
