const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {verify}=require('../windows/Verify-M59-Release');
const good={stage:'M59',passed:true,liveInputEnabled:false,checks:Array.from({length:5},()=>({passed:true})),artifacts:[{role:'Student',name:'FBS.Student.Native.exe',sizeBytes:5000,sha256:'a'.repeat(64)},{role:'Teacher',name:'FBS.Teacher.exe',sizeBytes:6000,sha256:'b'.repeat(64)}]};
test('M59 accepts complete release metadata',()=>assert.equal(verify(good).ready,true));
test('M59 rejects absent binary',()=>assert.equal(verify({...good,artifacts:good.artifacts.slice(0,1)}).ready,false));
test('M59 rejects duplicate roles',()=>assert.equal(verify({...good,artifacts:[good.artifacts[0],good.artifacts[0]]}).ready,false));
test('M59 rejects bad hash',()=>assert.equal(verify({...good,artifacts:[{...good.artifacts[0],sha256:'bad'},good.artifacts[1]]}).ready,false));
test('M59 rejects enabled input',()=>assert.equal(verify({...good,liveInputEnabled:true}).ready,false));
test('M59 rejects failed native test',()=>assert.equal(verify({...good,checks:[{passed:false},...good.checks.slice(1)]}).ready,false));
test('M59 script checks real EXE files and hashes',()=>{const s=fs.readFileSync(path.join(__dirname,'../windows/Test-M59-Release.ps1'),'utf8');assert.match(s,/Get-FileHash/);assert.match(s,/Test-Path -LiteralPath \$file/);assert.match(s,/dotnet publish/);assert.match(s,/Native safety tests/)});
