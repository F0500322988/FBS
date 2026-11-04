'use strict';
const crypto=require('node:crypto');
const {performance}=require('node:perf_hooks');
const uuid=s=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(s);
function createPauseStore({now=Date.now}={}){
 let session=null;
 function end(reason){if(session){session.active=false;for(const r of session.recipients)if(['requested','displayed'].includes(r.state))r.state=reason;}}
 function cleanup(){if(session?.active){if(now()>=session.expiresAt||now()>=session.leaseUntil)end('expired');else if(session.recipients.every(r=>!['requested','displayed'].includes(r.state)))session.active=false;}}
 function state(){cleanup();return session?{active:session.active,sessionId:session.id,expiresAt:session.expiresAt,leaseUntil:session.leaseUntil,recipients:session.recipients.map(({key,...r})=>({...r}))}:{active:false,recipients:[]};}
 function start(targets,seconds){
  cleanup();if(session?.active)throw Error('A screen pause is already active');
  if(!Number.isInteger(seconds)||seconds<30||seconds>300||!Array.isArray(targets)||!targets.length||targets.length>40||targets.some(t=>!t||typeof t.id!=='string'||typeof t.publicKey!=='string'||!t.publicKey)||new Set(targets.map(t=>t.id)).size!==targets.length)throw Error('Invalid screen pause');
  session={id:crypto.randomUUID(),active:true,expiresAt:now()+seconds*1000,leaseUntil:now()+10000,recipients:targets.map(t=>({id:t.id,key:t.publicKey,state:'requested'}))};return state();
 }
 function touch(id){cleanup();if(!session?.active||session.id!==id)throw Error('Screen pause ended');session.leaseUntil=Math.min(now()+10000,session.expiresAt);return state();}
 function stop(id){cleanup();if(!session||session.id!==id)throw Error('Unknown screen pause');end('stopped');return state();}
 function poll(device,key){cleanup();const r=session?.recipients.find(r=>r.id===device&&r.key===key);return session?.active&&r&&['requested','displayed'].includes(r.state)?{sessionId:session.id,remainingMs:Math.min(session.expiresAt,session.leaseUntil)-now()}:null;}
 function ack(id,device,key,status){cleanup();const r=session?.recipients.find(r=>r.id===device&&r.key===key);if(!session?.active||session.id!==id||!r||!['requested','displayed'].includes(r.state)||!['displayed','released'].includes(status))throw Error('Screen pause unavailable');r.state=status;cleanup();}
 function revoke(device){if(session)for(const r of session.recipients)if(r.id===device)r.state='revoked';cleanup();}
 return {state,start,touch,stop,poll,ack,revoke};
}
function createPauseReceiver({now=()=>performance.now()}={}){
 let current=null,revision=0;const dismissed=new Set();
 function clear(){current=null;revision++;}
 function snapshot(){if(current&&current.deadline<=now())clear();return current?{sessionId:current.sessionId,remainingMs:Math.max(0,Math.floor(current.deadline-now()))}:null;}
 function accept(value,expectedRevision){if(revision!==expectedRevision)return;if(!value){clear();return;}if(!uuid(value.sessionId)||!Number.isInteger(value.remainingMs)||value.remainingMs<1||value.remainingMs>10000){clear();return;}if(dismissed.has(value.sessionId)){current=null;return;}current={sessionId:value.sessionId,deadline:now()+value.remainingMs};}
 function dismiss(id){if(!uuid(id))throw Error('Invalid screen pause');dismissed.add(id);if(dismissed.size>100)dismissed.delete(dismissed.values().next().value);if(current?.sessionId===id)clear();}
 return {snapshot,accept,dismiss,clear,get revision(){return revision;}};
}
module.exports={createPauseStore,createPauseReceiver};
