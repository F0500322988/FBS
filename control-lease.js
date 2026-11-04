'use strict';
const crypto=require('node:crypto');
function createControlLeases({clock=Date.now,ttl=60000}={}){
 const sessions=new Map();const audit=[];
 const log=(event,id)=>{audit.push({event,deviceId:id,at:new Date(clock()).toISOString()});if(audit.length>500)audit.shift();};
 function cleanup(){for(const [id,s] of sessions)if(s.expiresAt<=clock()){sessions.delete(id);log('expired',id);}}
 function request(id){cleanup();if(sessions.has(id))return null;const session={deviceId:id,sessionId:crypto.randomUUID(),status:'pending-native-consent',requestedAt:clock(),expiresAt:clock()+ttl};sessions.set(id,session);log('request',id);return {...session};}
 function cancel(id){cleanup();if(!sessions.delete(id))return false;log('cancel',id);return true;}
 function studentStop(id,sessionId){cleanup();const s=sessions.get(id);if(!s||s.sessionId!==sessionId)return false;sessions.delete(id);log('student-stop',id);return true;}
 function pending(id){cleanup();const s=sessions.get(id);return s?{sessionId:s.sessionId,deviceId:id,status:s.status,expiresAt:s.expiresAt}:null;}
 function acknowledge(id,sessionId,approved){cleanup();const s=sessions.get(id);if(!s||s.sessionId!==sessionId||s.status!=='pending-native-consent'||typeof approved!=='boolean')return false;
 // Acknowledgement is not permission to send input: native input remains disabled.
 s.status=approved?'consented-no-input':'declined';s.expiresAt=clock()+15000;log(s.status,id);return true;}
 return {request,cancel,studentStop,pending,acknowledge,cleanup,sessions,audit};
}
module.exports={createControlLeases};
