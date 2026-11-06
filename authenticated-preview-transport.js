'use strict';
// M121: transport authentication for preview-only commands. Never invokes OS input.
const crypto=require('node:crypto');
const {signPreview,createAuthenticatedPreviewVerifier}=require('./authenticated-preview-channel');
const TEACHER_ID='fbs-teacher-lan'; // Transport role label, not a human identity assertion.
function sessionKey(secret,deviceId,sessionId){
 if(!require('./credential-policy').storedKey(secret)||typeof deviceId!=='string'||!deviceId||typeof sessionId!=='string'||!sessionId)throw Error('Invalid transport binding');
 return crypto.createHmac('sha256',secret).update(JSON.stringify(['FBS-M121-preview-v1',deviceId,sessionId])).digest();
}
function wrapCommands(commands,{secret,deviceId,sessionId}){
 const key=sessionKey(secret,deviceId,sessionId);
 return commands.map(c=>{
  if(c.sessionId!==sessionId)throw Error('Session mismatch');
  const payload={teacherId:TEACHER_ID,deviceId,sessionId,sequence:c.sequence,type:c.type,at:c.at,...(c.type==='pointer-preview'?{x:c.x,y:c.y}:{key:c.key})};
  return {payload,mac:signPreview(payload,key)};
 });
}
function createStudentPreviewTransport({secret,deviceId,clock=Date.now}){
 let active=null,verifier=null;
 function revoke(){verifier?.revoke();active=null;verifier=null;}
 function accept(envelope,{session,connected=false,enrolled=false,indicatorVisible=false,studentStopped=false}={}){
  if(!session||session.status!=='consented-no-input'||session.expiresAt<=clock()||!connected||!enrolled||!indicatorVisible||studentStopped){revoke();return null;}
  if(active!==session.sessionId){revoke();active=session.sessionId;verifier=createAuthenticatedPreviewVerifier({key:sessionKey(secret,deviceId,active),teacherId:TEACHER_ID,deviceId,sessionId:active,clock});}
  if(!envelope||!verifier.verify(envelope.payload,envelope.mac,{connected,enrolled,indicatorVisible,studentStopped}))return null;
  return {...envelope.payload};
 }
 return {accept,revoke,get nativeInputEnabled(){return false;}};
}
module.exports={TEACHER_ID,sessionKey,wrapCommands,createStudentPreviewTransport};
