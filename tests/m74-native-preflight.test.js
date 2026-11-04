'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {inspect}=require('../windows/M74-Native-Preflight');
const {required}=require('../windows/Verify-M60-Runtime');
function fixture(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fbs-m74-'));for(const file of required){const target=path.join(dir,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,'fixture');}return dir;}
test('M74 accepts complete nonempty offline distribution',()=>{const dir=fixture();try{const r=inspect(dir);assert.equal(r.passed,true);assert.equal(r.executablesLaunched,false);assert.equal(r.liveInputEnabled,false);assert.equal(r.checks.length,6);}finally{fs.rmSync(dir,{recursive:true,force:true});}});
test('M74 rejects missing executable',()=>{const dir=fixture();try{fs.unlinkSync(path.join(dir,'Teacher/FBS.Teacher.exe'));const r=inspect(dir);assert.equal(r.passed,false);assert.match(r.issues.join(' '),/FBS.Teacher.exe/);}finally{fs.rmSync(dir,{recursive:true,force:true});}});
test('M74 rejects empty executable',()=>{const dir=fixture();try{fs.writeFileSync(path.join(dir,'Student/FBS.Student.Native.exe'),'');assert.equal(inspect(dir).passed,false);}finally{fs.rmSync(dir,{recursive:true,force:true});}});
test('M74 rejects missing runtime dependencies',()=>{const dir=fixture();try{fs.unlinkSync(path.join(dir,'Runtime/teacher-lan.js'));assert.equal(inspect(dir).passed,false);}finally{fs.rmSync(dir,{recursive:true,force:true});}});
test('M74 records valid hashes without reading secrets',()=>{const dir=fixture();try{const r=inspect(dir);assert.match(r.checks[0].sha256,/^[a-f0-9]{64}$/);assert.equal(JSON.stringify(r).includes('pairing.dpapi'),false);}finally{fs.rmSync(dir,{recursive:true,force:true});}});
