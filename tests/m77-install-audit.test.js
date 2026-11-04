'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {audit}=require('../windows/M77-Install-Audit');
const {required,check}=require('../windows/M76-Package-Check');
function fixture(role) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'m77-'));
 for(const rel of required[role]) {const f=path.join(root,rel);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,'safe test content');}
 return root;
}
test('M77 accepts complete teacher installation',()=>{const r=fixture('Teacher');try{assert.equal(audit(r,'Teacher').passed,true)}finally{fs.rmSync(r,{recursive:true,force:true})}});
test('M77 accepts complete student installation',()=>{const r=fixture('Student');try{assert.equal(audit(r,'Student').passed,true)}finally{fs.rmSync(r,{recursive:true,force:true})}});
test('M77 rejects missing executable',()=>{const r=fixture('Teacher');try{fs.unlinkSync(path.join(r,required.Teacher[0]));assert.equal(audit(r,'Teacher').passed,false)}finally{fs.rmSync(r,{recursive:true,force:true})}});
test('M77 rejects tampered baseline file',()=>{const r=fixture('Student');try{const b=check(r,'Student');fs.writeFileSync(path.join(r,required.Student[0]),'tampered');assert.equal(audit(r,'Student',b).passed,false)}finally{fs.rmSync(r,{recursive:true,force:true})}});
test('M77 rejects mismatched role baseline',()=>{const r=fixture('Teacher');try{const b=check(r,'Teacher');b.role='Student';assert.equal(audit(r,'Teacher',b).passed,false)}finally{fs.rmSync(r,{recursive:true,force:true})}});
test('M77 rejects empty required file',()=>{const r=fixture('Student');try{fs.writeFileSync(path.join(r,required.Student[0]),'');assert.equal(audit(r,'Student').passed,false)}finally{fs.rmSync(r,{recursive:true,force:true})}});
test('M77 rejects invalid role',()=>assert.throws(()=>audit('/tmp','Other')));
