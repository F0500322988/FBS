'use strict';
const {validate:validateLab,MAX_FILE_BYTES}=require('./lab-settings');
const MAX_BYTES=1048576;
function validate(value){
 const reject=()=>{throw Object.assign(Error('Invalid lab profile library'),{status:400});};
 if(!value||value.version!==1||!Number.isSafeInteger(value.revision)||value.revision<0||!Array.isArray(value.profiles)||value.profiles.length>10)reject();
 const names=new Set(),ids=new Set();
 const profiles=value.profiles.map(p=>{
  if(!p||typeof p.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(p.id)||ids.has(p.id))reject();
  const lab=validateLab({...p,version:1,revision:0}),key=lab.name.toLowerCase();if(Buffer.byteLength(JSON.stringify({...lab,revision:Number.MAX_SAFE_INTEGER},null,2)+'\n')>MAX_FILE_BYTES)reject();if(names.has(key))reject();names.add(key);ids.add(p.id);
  return {id:p.id,name:lab.name,platform:lab.platform,groups:lab.groups};
 });
 return {version:1,revision:value.revision,profiles};
}
function createLabProfiles(file){return require('./atomic-json-store').createAtomicJsonStore(file,{initial:{version:1,revision:0,profiles:[]},validate,maxBytes:MAX_BYTES,errorName:'Lab profiles'});}
module.exports={createLabProfiles,validate,MAX_BYTES};
