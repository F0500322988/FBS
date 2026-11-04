'use strict';
const ALLOWED=new Set(['pointer-preview','key-preview']);
function createControlCommands({clock=Date.now}={}){
 const queues=new Map(),seq=new Map(),audit=[];
 function submit(session,command){
  if(!session||session.status!=='consented-no-input'||session.expiresAt<=clock())return {ok:false,error:'Session not active'};
  if(!command||!ALLOWED.has(command.type))return {ok:false,error:'Unsupported command'};
  if(command.type==='pointer-preview'&&(!Number.isInteger(command.x)||!Number.isInteger(command.y)||command.x<0||command.y<0||command.x>10000||command.y>10000))return {ok:false,error:'Invalid coordinates'};
  if(command.type==='key-preview'&&(!/^[A-Za-z0-9]{1}$/.test(command.key||'')))return {ok:false,error:'Invalid key'};
  const id=session.deviceId,number=(seq.get(id)||0)+1;seq.set(id,number);
  const item={sessionId:session.sessionId,sequence:number,type:command.type,...(command.type==='pointer-preview'?{x:command.x,y:command.y}:{key:command.key}),at:clock()};
  const q=queues.get(id)||[];q.push(item);if(q.length>30)q.shift();queues.set(id,q);
  audit.push({deviceId:id,sequence:number,type:item.type,at:item.at});if(audit.length>100)audit.shift();
  return {ok:true,sequence:number,executed:false};
 }
 function poll(session){
  if(!session||session.status!=='consented-no-input'||session.expiresAt<=clock())return [];
  const q=queues.get(session.deviceId)||[];queues.delete(session.deviceId);
  return q.filter(c=>c.sessionId===session.sessionId&&clock()-c.at<10000);
 }
 function clear(id){queues.delete(id);seq.delete(id);}
 return {submit,poll,clear,audit};
}
module.exports={createControlCommands};
