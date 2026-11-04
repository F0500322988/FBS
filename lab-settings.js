'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const MAX_FILE_BYTES=65536;
function invalid(){throw Object.assign(Error('Invalid lab settings'),{status:400});}
function label(value){if(typeof value!=='string'||value!==value.trim()||!value.length||value.length>60||/[\x00-\x1f\x7f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/.test(value))invalid();return value.normalize('NFC');}
function validate(value){
 if(!value||value.version!==1||!Number.isSafeInteger(value.revision)||value.revision<0||!['windows','macos','mixed'].includes(value.platform)||!Array.isArray(value.groups)||value.groups.length>20)invalid();
 const names=new Set(),ids=new Set();
 const groups=value.groups.map(g=>{
  if(!g||typeof g.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(g.id)||ids.has(g.id)||!Array.isArray(g.deviceIds)||g.deviceIds.length>40||g.deviceIds.some(id=>typeof id!=='string'||!/^[\w.-]{1,64}$/.test(id))||new Set(g.deviceIds).size!==g.deviceIds.length)invalid();
  const name=label(g.name),key=name.toLowerCase();if(names.has(key))invalid();names.add(key);ids.add(g.id);return {id:g.id,name,deviceIds:[...g.deviceIds]};
 });
 return {version:1,revision:value.revision,name:label(value.name),platform:value.platform,groups};
}
function createLabSettings(file,{platform=process.platform==='darwin'?'macos':'windows'}={}){
 const initial={version:1,revision:0,name:platform==='macos'?'معمل Mac':'معمل ويندوز 11',platform,groups:[]};
 let state=initial,stamp=null;
 function disk(){
  try{
   const stat=fs.lstatSync(file);if(!stat.isFile()||stat.size>MAX_FILE_BYTES)throw Error();
   const text=fs.readFileSync(file,'utf8');return {state:validate(JSON.parse(text)),stamp:crypto.createHash('sha256').update(text).digest('hex')};
  }catch(e){if(e.code==='ENOENT')return {state:initial,stamp:null};throw Object.assign(Error('Lab settings cannot be read; existing file was preserved'),{status:503});}
 }
 function snapshot(){const current=disk();state=current.state;stamp=current.stamp;return structuredClone(state);}
 function save(input){
  const next=validate({...input,version:1});if(next.revision>=Number.MAX_SAFE_INTEGER)invalid();
  let lockOwned=false,tempOwned=false;const lock=file+'.lock',temp=file+'.'+crypto.randomUUID()+'.tmp';
  try{
   fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
   const lockFd=fs.openSync(lock,'wx',0o600);lockOwned=true;fs.closeSync(lockFd);
   const current=disk();
   if(next.revision!==state.revision||current.stamp!==stamp)throw Object.assign(Error('Lab settings changed; reload before saving'),{status:409});
   next.revision++;const text=JSON.stringify(next,null,2)+'\n';if(Buffer.byteLength(text)>MAX_FILE_BYTES)invalid();
   const fd=fs.openSync(temp,'wx',0o600);tempOwned=true;
   try{fs.writeFileSync(fd,text);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
   fs.renameSync(temp,file);tempOwned=false;state=next;stamp=crypto.createHash('sha256').update(text).digest('hex');return structuredClone(state);
  }catch(e){if(e.status)throw e;throw Object.assign(Error('Lab settings could not be saved; retry after checking storage'),{status:503});}
  finally{if(tempOwned)fs.unlinkSync(temp);if(lockOwned)fs.unlinkSync(lock);}
 }
 // Load without creating or replacing a file; corruption remains visible to callers.
 try{snapshot();}catch{}
 return {snapshot,save};
}
module.exports={createLabSettings,validate,MAX_FILE_BYTES};
