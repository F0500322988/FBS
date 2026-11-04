'use strict';
const crypto=require('node:crypto');
const MAX_BYTES=5*1024*1024;
const validName=name=>typeof name==='string'&&name.length>0&&name.length<=120&&!/[\x00-\x1f\x7f\u200b-\u200f\u202a-\u202e\u2066-\u2069<>:"/\\|?*]/.test(name)&&!/[. ]$/.test(name)&&!/^\./.test(name)&&!/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name);
function decodeFile(base64,size,sha256){
 if(typeof base64!=='string'||base64.length>Math.ceil(MAX_BYTES/3)*4||base64.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))throw Error('Invalid file data');
 const data=Buffer.from(base64,'base64');if(!data.length||data.length>MAX_BYTES||data.toString('base64')!==base64||size!==undefined&&data.length!==size||sha256!==undefined&&crypto.createHash('sha256').update(data).digest('hex')!==sha256)throw Error('File integrity check failed');return data;
}
function createFileStore({now=Date.now}={}){
 const files=new Map();
 function expire(){for(const f of files.values())if(f.expiresAt<=now()){f.data=null;for(const r of f.recipients)if(!['saved','revoked'].includes(r.state))r.state='expired';}}
 function metadata(f){return {id:f.id,name:f.name,size:f.size,sha256:f.sha256,expiresAt:f.expiresAt};}
 function create(name,base64,targets){
  if(!validName(name)||!Array.isArray(targets)||!targets.length||targets.length>40||new Set(targets.map(t=>t.id)).size!==targets.length||targets.some(t=>!t||typeof t.id!=='string'||typeof t.publicKey!=='string'||!t.publicKey))throw Error('Invalid file or recipients');
  const data=decodeFile(base64);expire();
  if([...files.values()].filter(f=>f.data).length>=10)throw Error('File queue full');
  if(files.size>=100){const old=[...files.values()].find(f=>!f.data);if(!old)throw Error('File queue full');files.delete(old.id);}
  const f={id:crypto.randomUUID(),name,size:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex'),expiresAt:now()+300000,data,recipients:targets.map(t=>({id:t.id,key:t.publicKey,state:'queued'}))};files.set(f.id,f);return metadata(f);
 }
 function find(id,device,key){expire();const f=files.get(id),r=f?.recipients.find(r=>r.id===device&&r.key===key&&r.state!=='revoked');if(!f||!f.data||!r)throw Error('File unavailable');return {f,r};}
 function poll(device,key){expire();return [...files.values()].filter(f=>f.data&&f.recipients.some(r=>r.id===device&&r.key===key&&r.state!=='revoked')).map(metadata);}
 function download(id,device,key){const {f}=find(id,device,key);return {...metadata(f),base64:f.data.toString('base64')};}
 function acknowledge(id,device,key,state){if(!['downloaded','saved'].includes(state))throw Error('Invalid receipt');const {r}=find(id,device,key);if(state==='saved'&&!['downloaded','saved'].includes(r.state))throw Error('Download not acknowledged');if(r.state!=='saved')r.state=state;}
 function revoke(device){for(const f of files.values()){for(const r of f.recipients)if(r.id===device)r.state='revoked';if(f.recipients.every(r=>r.state==='revoked'))f.data=null;}}
 return {create,poll,download,acknowledge,revoke,snapshot:()=>{expire();return [...files.values()].reverse().map(f=>({...metadata(f),recipients:f.recipients.map(({key,...r})=>({...r}))}));}};
}
module.exports={MAX_BYTES,validName,decodeFile,createFileStore};
