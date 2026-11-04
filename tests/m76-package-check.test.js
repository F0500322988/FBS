'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {check,required}=require('../windows/M76-Package-Check');
function fixture(role){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fbs-m76-'));for(const file of required[role]){const p=path.join(dir,...file.split('/'));fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,'sample')}return dir}
for(const role of ['Teacher','Student']){
 test(`${role} complete package passes`,t=>{const dir=fixture(role);t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const r=check(dir,role);assert.equal(r.passed,true);assert.equal(r.files.length,required[role].length);assert.equal(r.liveInputEnabled,false)});
 test(`${role} missing file fails closed`,t=>{const dir=fixture(role);t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));fs.unlinkSync(path.join(dir,...required[role][0].split('/')));assert.equal(check(dir,role).passed,false)});
 test(`${role} empty file fails closed`,t=>{const dir=fixture(role);t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));fs.writeFileSync(path.join(dir,...required[role][0].split('/')),'');assert.equal(check(dir,role).passed,false)});
}
test('invalid role rejected',()=>assert.throws(()=>check('/tmp','Other'),/Role/));
test('M76 teacher installer references correct executable',()=>{const s=fs.readFileSync(path.join(__dirname,'../windows/installer/M76-Teacher.iss'),'utf8');assert.match(s,/FBS\.Teacher\.exe/);assert.doesNotMatch(s,/FBS\.Teacher\.Launcher\.exe/)});
test('M76 student installer does not automatically start on installation',()=>{const s=fs.readFileSync(path.join(__dirname,'../windows/installer/M76-Student.iss'),'utf8');assert.doesNotMatch(s,/\[Run\][\s\S]*^Filename:.*FBS\.Student\.Native\.exe/m)});
