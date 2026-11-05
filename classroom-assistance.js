'use strict';
const crypto=require('node:crypto');const {performance}=require('node:perf_hooks');
const uuid=s=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(s);
function cleanAction(c){
 if(c?.type==='move'&&Number.isInteger(c.dx)&&Number.isInteger(c.dy)&&Math.abs(c.dx)<=100&&Math.abs(c.dy)<=100&&(c.dx||c.dy))return {type:'move',dx:c.dx,dy:c.dy};
 if(c?.type==='text'&&typeof c.text==='string'&&c.text.length>0&&c.text.length<=80&&!/[\x00-\x1f\x7f-\x9f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/.test(c.text)&&c.text.isWellFormed())return {type:'text',text:c.text};
 throw Error('Unsupported assistance action');
}
function createAssistanceStore({now=Date.now}={}){
 let session=null,lastTime=now();const active=s=>s&&['requested','active'].includes(s.status);
 function end(reason){if(session){session.status=reason;session.queue=[];}}
 function cleanup(){const time=now();if(time<lastTime&&active(session))end('clock-changed');lastTime=time;if(active(session)&&(now()>=session.expiresAt||now()>=session.leaseUntil))end('expired');}
 function state(){cleanup();return session?{sessionId:session.id,deviceId:session.deviceId,status:session.status,expiresAt:session.expiresAt,lastReceipt:session.lastReceipt}: {status:'idle'};}
 function owner(id,token){cleanup();if(!active(session)||session.id!==id||typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)||!crypto.timingSafeEqual(Buffer.from(token,'hex'),Buffer.from(session.token,'hex')))throw Error('Assistance owner unavailable');}
 function member(id,key,sessionId){cleanup();if(!active(session)||session.deviceId!==id||session.key!==key||!uuid(sessionId)||session.id!==sessionId)throw Error('Assistance unavailable');}
 function start(device){cleanup();if(active(session)||!device||typeof device.id!=='string'||!device.publicKey||device.assistanceSupported!==true)throw Error('Assistance unavailable');session={id:crypto.randomUUID(),deviceId:device.id,key:device.publicKey,token:crypto.randomBytes(32).toString('hex'),status:'requested',expiresAt:now()+120000,leaseUntil:now()+6000,queue:[],sequence:0,lastReceipt:null};return {...state(),controlToken:session.token};}
 function touch(id,token){owner(id,token);session.leaseUntil=Math.min(now()+6000,session.expiresAt);return state();}
 function stop(id){if(!session||session.id!==id)throw Error('Unknown assistance');end('stopped');return state();}
 function decide(device,key,id,approved){member(device,key,id);if(session.status!=='requested'||typeof approved!=='boolean')throw Error('Invalid consent');if(approved)session.status='active';else end('declined');return state();}
 function release(device,key,id){member(device,key,id);end('student-stopped');}
 function submit(id,token,action,freshFrame){owner(id,token);if(session.status!=='active'||!freshFrame)throw Error('Consent and current screen required');const cleaned=cleanAction(action);if(session.queue.length>=8)throw Error('Assistance queue full');const sequence=++session.sequence;session.queue.push({...cleaned,sequence,createdAt:now()});return {sequence,status:'queued'};}
 function poll(device,key){cleanup();if(!active(session)||session.deviceId!==device||session.key!==key)return null;const commands=session.status==='active'?session.queue.filter(c=>now()-c.createdAt<2000):[];session.queue=[];return {sessionId:session.id,status:session.status,remainingMs:Math.min(session.leaseUntil,session.expiresAt)-now(),commands};}
 function receipt(device,key,id,sequence,status){member(device,key,id);if(session.status!=='active'||!Number.isSafeInteger(sequence)||sequence<1||sequence>session.sequence||!['submitted','rejected'].includes(status))throw Error('Invalid receipt');if(!session.lastReceipt||sequence>session.lastReceipt.sequence)session.lastReceipt={sequence,status};}
 function revoke(device){if(session?.deviceId===device)end('revoked');}
 return {state,start,touch,stop,decide,release,submit,poll,receipt,revoke};
}
function createAssistanceReceiver({now=()=>performance.now()}={}){
 let value=null,deadline=0,revision=0,lastSequence=0,approved=null,hardEnd=0;const closed=new Set();
 function clear(){value=null;deadline=0;approved=null;lastSequence=0;hardEnd=0;revision++;}
 function close(id){if(!uuid(id))throw Error('Invalid session');closed.add(id);if(closed.size>100)closed.delete(closed.values().next().value);if(value?.sessionId===id)clear();}
 function snapshot(){if(value&&deadline<=now())clear();return value?{...value,remainingMs:Math.max(0,Math.floor(deadline-now())),commands:[...value.commands]}:null;}
 function consent(id){if(snapshot()?.sessionId!==id||value.status!=='requested')throw Error('Consent no longer available');approved=id;value.locallyApproved=true;revision++;return revision;}
 function accept(packet,expected){if(expected!==revision)return;if(!packet){clear();return;}if(!uuid(packet.sessionId)||!['requested','active'].includes(packet.status)||!Number.isInteger(packet.remainingMs)||packet.remainingMs<1||packet.remainingMs>6000||!Array.isArray(packet.commands)||packet.commands.length>8){clear();return;}if(closed.has(packet.sessionId))return clear();if(value?.sessionId!==packet.sessionId){approved=null;lastSequence=0;hardEnd=now()+120000;}const commands=[];if(packet.status==='active'&&approved===packet.sessionId)for(const c of packet.commands){if(!Number.isSafeInteger(c.sequence)||c.sequence<=lastSequence)continue;try{const a=cleanAction(c);commands.push({...a,sequence:c.sequence});lastSequence=c.sequence;}catch{}}
 value={sessionId:packet.sessionId,status:packet.status,locallyApproved:approved===packet.sessionId,commands};deadline=Math.min(now()+packet.remainingMs,hardEnd);
 }
 function take(){const s=snapshot();if(value)value.commands=[];return s;}
 return {snapshot,take,accept,consent,close,clear,get revision(){return revision;}};
}
module.exports={cleanAction,createAssistanceStore,createAssistanceReceiver};
