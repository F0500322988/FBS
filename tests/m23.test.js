'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createControlCommands}=require('../control-commands');
test('M23 queues preview commands only for consented active session, drains once',()=>{
 let now=1000;const c=createControlCommands({clock:()=>now});
 const s={deviceId:'PC-01',sessionId:'abc',status:'consented-no-input',expiresAt:5000};
 assert.equal(c.submit({...s,status:'pending-native-consent'},{type:'pointer-preview',x:2,y:3}).ok,false);
 assert.equal(c.submit(s,{type:'pointer-preview',x:2,y:3}).executed,false);
 assert.equal(c.submit(s,{type:'key-preview',key:'A'}).ok,true);
 assert.equal(c.submit(s,{type:'key-preview',key:'ENTER'}).ok,false);
 assert.equal(c.poll(s).length,2);assert.equal(c.poll(s).length,0);
 c.submit(s,{type:'pointer-preview',x:4,y:5});c.clear(s.deviceId);assert.equal(c.poll(s).length,0);
 now=5001;assert.equal(c.submit(s,{type:'pointer-preview',x:2,y:3}).ok,false);
});
test('M23 signed student stop route is included in enrollment gate',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'../teacher-lan.js'),'utf8');
 assert.match(source,/\['\/control\/poll','\/control\/ack','\/control\/stop','\/control\/commands'\]/);
});
