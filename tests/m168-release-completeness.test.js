const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {verify,required}=require('../windows/Verify-M60-Runtime');

test('release verification rejects missing imported transport or referenced dashboard script',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'fbs-release-'));
 try{
  for(const name of required){const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'fixture');}
  assert.equal(verify(root).ok,true);
  for(const name of ['Runtime/authenticated-preview-transport.js','Runtime/authenticated-preview-channel.js','Runtime/public/m114-seat-view.js','Runtime/public/app.js']){
   const file=path.join(root,name);fs.unlinkSync(file);
   assert.ok(verify(root).missing.includes(name),name);
   fs.writeFileSync(file,'fixture');
  }
  fs.writeFileSync(path.join(root,'Runtime/node.exe'),'');
  assert.ok(verify(root).missing.includes('Runtime/node.exe'),'empty runtime must fail');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('teacher installer shortcut and uninstall icon reference the real assembly name',()=>{
 const project=fs.readFileSync(path.join(__dirname,'../windows/FBS.Teacher.Launcher/FBS.Teacher.Launcher.csproj'),'utf8');
 const assembly=project.match(/<AssemblyName>([^<]+)<\/AssemblyName>/)[1]+'.exe';
 for(const filename of ['FBS-Teacher.iss','M76-Teacher.iss']){
  const script=fs.readFileSync(path.join(__dirname,'../windows/installer',filename),'utf8');
  const targets=[...script.matchAll(/(?:Filename:\s*|UninstallDisplayIcon=)(?:"?\{app\}\\Teacher\\)([^"\r\n;]+)/g)].map(match=>match[1]);
  assert.ok(targets.length>=2,filename);
  for(const target of targets)assert.equal(target,assembly,filename);
 }
});
