'use strict';
const {randomUUID}=require('node:crypto');
const validId=value=>typeof value==='string'&&/^[0-9a-f-]{36}$/.test(value);
const validText=value=>typeof value==='string'&&value.trim().length>0&&value.length<=2000&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
function createMessageStore({now=Date.now,maxMessages=100}={}){
 const messages=new Map();
 function expire(){for(const m of messages.values())for(const r of m.recipients)if(m.expiresAt<=now()&&['queued','received'].includes(r.state))r.state='expired';}
 function create(text,targets){
  if(!validText(text)||!Array.isArray(targets)||targets.length<1||targets.length>40||new Set(targets.map(t=>t.id)).size!==targets.length||targets.some(t=>typeof t.id!=='string'||!/^[\w.-]{1,64}$/.test(t.id)||typeof t.publicKey!=='string'||!t.publicKey))throw Error('Invalid message');
  expire();
  if(messages.size>=maxMessages){const removable=[...messages.values()].find(m=>m.recipients.every(r=>['read','expired','revoked'].includes(r.state)));if(!removable)throw Error('Message queue full');messages.delete(removable.id);}
  const m={id:randomUUID(),text:text.trim(),createdAt:now(),expiresAt:now()+300000,recipients:targets.map(t=>({id:t.id,key:t.publicKey,state:'queued'}))};messages.set(m.id,m);return m.id;
 }
 function poll(id,key,acks=[]){
  expire();if(!Array.isArray(acks)||acks.length>30)throw Error('Invalid acknowledgements');
  for(const ack of acks)if(!ack||!validId(ack.id)||!['received','read'].includes(ack.state))throw Error('Invalid acknowledgement');
  for(const ack of acks){
   const m=messages.get(ack.id),r=m?.recipients.find(t=>t.id===id&&t.key===key);
   if(r&&m.expiresAt>now()&&['queued','received','read'].includes(r.state)){
    if(ack.state==='read'){r.state='read';r.readAt??=now();r.receivedAt??=now();}
    else if(r.state==='queued'){r.state='received';r.receivedAt=now();}
   }
  }
  return [...messages.values()].filter(m=>m.expiresAt>now()&&m.recipients.some(r=>r.id===id&&r.key===key&&['queued','received'].includes(r.state))).sort((a,b)=>Number(b.recipients.some(r=>r.id===id&&r.key===key&&r.state==='queued'))-Number(a.recipients.some(r=>r.id===id&&r.key===key&&r.state==='queued'))).slice(0,10).map(({id,text,createdAt,expiresAt})=>({id,text,createdAt,expiresAt}));
 }
 function revoke(id){for(const m of messages.values())for(const r of m.recipients)if(r.id===id&&['queued','received'].includes(r.state))r.state='revoked';}
 function snapshot(){expire();return [...messages.values()].reverse().map(m=>({...m,recipients:m.recipients.map(({key,...r})=>r)}));}
 return {create,poll,revoke,snapshot};
}
function createStudentInbox({now=Date.now}={}){
 const items=new Map(),acks=new Map();
 function prune(){for(const [id,m]of items)if(m.expiresAt<=now()){items.delete(id);acks.delete(id);}}
 function accept(incoming){
  if(!Array.isArray(incoming)||incoming.length>10)throw Error('Invalid inbox');
  // Validate the complete batch before changing local state.
  for(const m of incoming)if(!m||!validId(m.id)||!validText(m.text)||!Number.isFinite(m.createdAt)||!Number.isFinite(m.expiresAt)||m.createdAt>now()+5000||m.expiresAt<=now()||m.expiresAt-m.createdAt>300000||m.expiresAt<=m.createdAt)throw Error('Invalid inbox message');
  prune();for(const m of incoming){if(items.has(m.id))continue;if(items.size>=30)break;items.set(m.id,{id:m.id,text:m.text,createdAt:m.createdAt,expiresAt:m.expiresAt,read:false});acks.set(m.id,'received');}
 }
 function read(id){prune();const m=items.get(id);if(!m)return false;m.read=true;acks.set(id,'read');return true;}
 function pending(){prune();return [...acks].map(([id,state])=>({id,state}));}
 function confirm(sent){for(const a of sent)if(acks.get(a.id)===a.state)acks.delete(a.id);}
 return {accept,read,pending,confirm,snapshot:()=>{prune();return [...items.values()].map(m=>({...m}));},clear:()=>{items.clear();acks.clear();}};
}
module.exports={createMessageStore,createStudentInbox};
