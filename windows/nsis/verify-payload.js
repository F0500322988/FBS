'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
function hash(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function machine(file){const raw=fs.readFileSync(file);if(raw.length<64||raw.toString('ascii',0,2)!=='MZ')throw Error('Invalid executable');const offset=raw.readUInt32LE(0x3c);if(offset+6>raw.length||raw.toString('binary',offset,offset+4)!=='PE\0\0')throw Error('Invalid PE header');return raw.readUInt16LE(offset+4);}
function verify(stage,output,releaseStage="M170"){
 if(!/^M[0-9]+$/.test(releaseStage))throw Error("Invalid release stage");
 const installers=[];
 for(const role of ['Teacher','Student']){
  const manifest=JSON.parse(fs.readFileSync(path.join(stage,'payload-'+role+'.json'),'utf8'));
  const extracted=path.join(output,'extracted-'+role);
  const expected=new Set();
  for(const file of manifest.files){
   if(typeof file.path!=='string'||file.path.startsWith('/')||file.path.includes('\\')||file.path.split('/').some(part=>part==='..'||part===''))throw Error('Unsafe payload manifest path');
   const target=path.join(extracted,file.path);const stat=fs.lstatSync(target);
   if(!stat.isFile()||stat.isSymbolicLink()||stat.size!==file.size||hash(target)!==file.sha256)throw Error('Payload mismatch: '+role+'/'+file.path);
   expected.add(file.path);
  }
  const internal=new Set(['$PLUGINSDIR/System.dll','$PLUGINSDIR/modern-wizard.bmp','$PLUGINSDIR/nsDialogs.dll']);
  function inspect(relative){for(const entry of fs.readdirSync(path.join(extracted,relative),{withFileTypes:true})){
   const name=path.posix.join(relative,entry.name);const stat=fs.lstatSync(path.join(extracted,name));
   if(stat.isSymbolicLink())throw Error('Unexpected extracted symlink');
   if(stat.isDirectory())inspect(name);else if(!expected.has(name)&&!internal.has(name))throw Error('Unexpected installer content: '+name);
  }}inspect('');
  const exe=role==='Teacher'?'FBS.Teacher.exe':'FBS.Student.Native.exe';
  if(machine(path.join(extracted,role,exe))!==0x8664)throw Error('Application must target Windows x64');
  const name='FBS-Classroom-'+role+'-'+releaseStage+'-Setup-PREVIEW.exe';const file=path.join(output,name);
  if(machine(file)!==0x14c)throw Error('Unexpected NSIS bootstrap architecture');
  installers.push({role,file:name,size:fs.statSync(file).size,sha256:hash(file),payloadFilesVerified:expected.size,installerArchitecture:'x86 Unicode NSIS bootstrap',applicationArchitecture:'Windows x64',signed:false});
 }
 return {stage:releaseStage==='M170'?'M171':releaseStage,applicationVersion:'0.180.0-preview',buildTool:'NSIS native Linux compiler / signed Debian packages',buildPassed:true,allPayloadSha256Verified:true,unexpectedPayloadRejected:true,windowsInstallExecuted:false,windowsGuiExecuted:false,twoPcLanTested:false,installers};
}
if(require.main===module){if(![4,5].includes(process.argv.length))throw Error('Usage: node verify-payload.js <stage-root> <output-root> [M-stage]');const result=verify(path.resolve(process.argv[2]),path.resolve(process.argv[3]),process.argv[4]);fs.writeFileSync(path.join(process.argv[3],'installer-verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));}
module.exports={verify};
