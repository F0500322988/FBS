'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function createAtomicJsonStore(file,{initial,validate,maxBytes,errorName='Lab settings'}){
 let state=initial,stamp=null;
 function disk(){
  try{
   const stat=fs.lstatSync(file);if(!stat.isFile()||stat.size>maxBytes)throw Error();
   const text=fs.readFileSync(file,'utf8');return {state:validate(JSON.parse(text)),stamp:crypto.createHash('sha256').update(text).digest('hex')};
  }catch(e){if(e.code==='ENOENT')return {state:initial,stamp:null};throw Object.assign(Error(errorName+' cannot be read; existing file was preserved'),{status:503});}
 }
 function snapshot(){const current=disk();state=current.state;stamp=current.stamp;return structuredClone(state);}
 function save(input){
  const next=validate({...input,version:1});if(next.revision>=Number.MAX_SAFE_INTEGER)throw Object.assign(Error('Invalid document limits'),{status:400});
  let lockOwned=false,tempOwned=false;const lock=file+'.lock',temp=file+'.'+crypto.randomUUID()+'.tmp';
  try{
   fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
   const lockFd=fs.openSync(lock,'wx',0o600);lockOwned=true;fs.closeSync(lockFd);
   const current=disk();
   if(next.revision!==state.revision||current.stamp!==stamp)throw Object.assign(Error(errorName+' changed; reload before saving'),{status:409});
   next.revision++;const text=JSON.stringify(next,null,2)+'\n';if(Buffer.byteLength(text)>maxBytes)throw Object.assign(Error('Invalid document limits'),{status:400});
   const fd=fs.openSync(temp,'wx',0o600);tempOwned=true;
   try{fs.writeFileSync(fd,text);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
   fs.renameSync(temp,file);tempOwned=false;state=next;stamp=crypto.createHash('sha256').update(text).digest('hex');return structuredClone(state);
  }catch(e){if(e.status)throw e;throw Object.assign(Error(errorName+' could not be saved; retry after checking storage'),{status:503});}
  finally{if(tempOwned)fs.unlinkSync(temp);if(lockOwned)fs.unlinkSync(lock);}
 }
 // Load without creating or replacing a file; corruption remains visible to callers.
 try{snapshot();}catch{}
 return {snapshot,save};
}
module.exports={createAtomicJsonStore};
