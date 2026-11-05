'use strict';
const MAX_FILE_BYTES=65536;
function invalid(){throw Object.assign(Error('Invalid lab settings'),{status:400});}
function label(value){if(typeof value!=='string')invalid();value=value.normalize('NFC');if(value!==value.trim()||!value.length||value.length>60||/[\x00-\x1f\x7f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/.test(value))invalid();return value;}
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
 return require('./atomic-json-store').createAtomicJsonStore(file,{initial,validate,maxBytes:MAX_FILE_BYTES});
}
module.exports={createLabSettings,validate,MAX_FILE_BYTES};
