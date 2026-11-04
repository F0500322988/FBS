// M61: offline integrity manifest for a built M60 Windows distribution.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {required}=require('./Verify-M60-Runtime');
const normalize=p=>p.replace(/\\/g,'/');
function digest(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function create(dir){
 const root=path.resolve(dir);
 const files=[];
 for(const rel of required){
  const file=path.join(root,rel);
  if(!fs.statSync(file).isFile())throw Error('Missing required file: '+rel);
  files.push({path:normalize(rel),sizeBytes:fs.statSync(file).size,sha256:digest(file)});
 }
 return {schema:'fbs-m61-manifest-v1',stage:'M61',liveInputEnabled:false,files};
}
function verify(dir,manifest){
 if(!manifest||manifest.schema!=='fbs-m61-manifest-v1'||manifest.liveInputEnabled!==false||!Array.isArray(manifest.files))return {ok:false,errors:['Invalid manifest schema or safety flag']};
 const errors=[];const names=new Set();
 for(const item of manifest.files){
  if(!item||typeof item.path!=='string'||!required.includes(item.path)||names.has(item.path)||!Number.isSafeInteger(item.sizeBytes)||item.sizeBytes<0||!/^[a-f0-9]{64}$/.test(item.sha256||'')){errors.push('Invalid or duplicate entry');continue;}
  names.add(item.path);
  const file=path.join(path.resolve(dir),item.path);
  try{if(fs.statSync(file).size!==item.sizeBytes||digest(file)!==item.sha256)errors.push('Integrity mismatch: '+item.path)}catch{errors.push('Missing: '+item.path)}
 }
 for(const name of required)if(!names.has(name))errors.push('Manifest missing: '+name);
 return {ok:errors.length===0,errors};
}
if(require.main===module){
 try{
  const [mode,dir,manifestFile]=process.argv.slice(2);
  if(!['create','verify'].includes(mode)||!dir||!manifestFile)throw Error('Usage: node windows/M61-Manifest.js create|verify DIST MANIFEST.json');
  if(mode==='create'){
   const manifest=create(dir);fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');console.log('M61 manifest created:',manifestFile);
  }else{
   const result=verify(dir,JSON.parse(fs.readFileSync(manifestFile,'utf8')));console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;
  }
 }catch(err){console.error(err.message);process.exitCode=1}
}
module.exports={create,verify};
