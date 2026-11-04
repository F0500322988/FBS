const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {required}=require('../windows/M76-Package-Check');
const {prepare}=require('../windows/nsis/prepare-manifests');
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'fbs-nsis-'));
 for(const role of ['Teacher','Student'])for(const name of required[role]){
  const file=path.join(root,role,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'fixture');
 }
 return root;
}
test('installer manifests contain exact payload hashes and nonrecursive owned-file deletion',()=>{
 const root=fixture();
 try{
  prepare(root);
  for(const role of ['Teacher','Student']){
   const manifest=JSON.parse(fs.readFileSync(path.join(root,'payload-'+role+'.json'),'utf8'));
   const removal=fs.readFileSync(path.join(root,'delete-'+role+'.nsh'),'utf8');
   assert.equal(manifest.files.length,required[role].length);
   assert.ok(manifest.files.every(file=>file.size===7&&/^[a-f0-9]{64}$/.test(file.sha256)));
   assert.doesNotMatch(removal,/RMDir\s+\/r|LOCALAPPDATA|APPDATA|USERPROFILE|Delete\s+"[^"\r\n]*\*/i);
   assert.match(removal,/SetErrorLevel 3/,'locked-file failures must not silently remove uninstall registration');
  }
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('unexpected root files and NSIS filename interpolation are rejected before packaging',()=>{
 for(const bad of ['personal-settings.json','Runtime/unexpected$INSTDIR.txt']){
  const root=fixture();
  try{
   const file=path.join(root,'Teacher',bad);fs.writeFileSync(file,'not-user-data');
   assert.throws(()=>prepare(root),/Unexpected payload file|Unsafe Windows payload filename/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
 }
});
