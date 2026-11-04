const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {check,required}=require('../windows/M76-Package-Check');
test('each role package rejects missing explicit-endpoint and pinned-TLS dependencies',()=>{
 for(const role of ['Teacher','Student']){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'fbs-m170-package-'));
  try{
   for(const name of required[role]){const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'fixture');}
   assert.equal(check(root,role).passed,true);
   for(const name of ['Runtime/teacher-endpoint.js','Runtime/pinned-https.js']){
    const file=path.join(root,name);fs.unlinkSync(file);
    assert.equal(check(root,role).passed,false,role+' '+name);
    fs.writeFileSync(file,'fixture');
   }
  }finally{fs.rmSync(root,{recursive:true,force:true});}
 }
});
