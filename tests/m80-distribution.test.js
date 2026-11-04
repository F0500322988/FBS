'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {inspect}=require('../windows/M80-Distribution-Gate');const {required}=require('../windows/M76-Package-Check');
function fixture(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'fbs-m80-'));for(const role of ['Teacher','Student']) {for(const file of required[role]) {const target=path.join(root,role,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,role+file);}fs.writeFileSync(path.join(root,`FBS-Classroom-${role}-M76-Portable.zip`),role+' ZIP');}return root;}
function withFixture(fn){const root=fixture();try{fn(root)}finally{fs.rmSync(root,{recursive:true,force:true})}}
test('M80 passes two complete independent packages',()=>withFixture(root=>assert.equal(inspect(root).passed,true)));
test('M80 rejects missing student runtime',()=>withFixture(root=>{fs.rmSync(path.join(root,'Student','Runtime','node.exe'));assert.equal(inspect(root).passed,false)}));
test('M80 rejects missing portable archive',()=>withFixture(root=>{fs.rmSync(path.join(root,'FBS-Classroom-Teacher-M76-Portable.zip'));assert.equal(inspect(root).passed,false)}));
test('M80 rejects identical role archives',()=>withFixture(root=>{fs.writeFileSync(path.join(root,'FBS-Classroom-Student-M76-Portable.zip'),'Teacher ZIP');assert.match(inspect(root).problems.join(' '),/identical/)}));
test('M80 requires installer EXEs only when requested',()=>withFixture(root=>{assert.equal(inspect(root).passed,true);assert.equal(inspect(root,{requireInstallers:true}).passed,false)}));
test('M80 accepts nonempty separate installers',()=>withFixture(root=>{for(const role of ['Teacher','Student'])fs.writeFileSync(path.join(root,`FBS-Classroom-${role}-M76-Setup-PREVIEW.exe`),role);assert.equal(inspect(root,{requireInstallers:true}).passed,true)}));
test('M80 rejects empty installer',()=>withFixture(root=>{for(const role of ['Teacher','Student'])fs.writeFileSync(path.join(root,`FBS-Classroom-${role}-M76-Setup-PREVIEW.exe`),role==='Teacher'?'':'student');assert.equal(inspect(root,{requireInstallers:true}).passed,false)}));
