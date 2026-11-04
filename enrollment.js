'use strict';
const fs=require('node:fs'),path=require('node:path');
function createEnrollment(file){
 const approved=new Set();
 const keys=new Map();
 if(fs.existsSync(file)){
  const data=JSON.parse(fs.readFileSync(file,'utf8'));
  if(!Array.isArray(data.approved)||!data.approved.every(id=>typeof id==='string'&&/^[\w.-]{1,64}$/.test(id)))throw Error('Invalid enrollment store');
  data.approved.forEach(id=>approved.add(id));
  for(const [id,key] of Object.entries(data.keys||{})){if(!/^[\w.-]{1,64}$/.test(id)||typeof key!=='string')throw Error('Invalid enrolled key');keys.set(id,key);}
 }
 function persist(){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=file+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,JSON.stringify({approved:[...approved].sort(),keys:Object.fromEntries(keys)},null,2),{mode:0o600});fs.renameSync(tmp,file);}
 return {approved,keys,approve(id,key){if(!/^[\w.-]{1,64}$/.test(id))throw Error('Invalid device id');if(key){keys.set(id,key);}approved.add(id);persist();},revoke(id){approved.delete(id);keys.delete(id);persist();}};
}
module.exports={createEnrollment};
