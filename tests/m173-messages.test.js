'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createMessageStore,createStudentInbox}=require('../classroom-messages');
const targets=[{id:'PC-01',publicKey:'key1'},{id:'PC-02',publicKey:'key2'}];
test('message delivery binds each recipient to its approved key and supports monotonic acknowledgements',()=>{
 const s=createMessageStore();const id=s.create('مرحبا',targets);
 assert.equal(s.poll('PC-01','wrong').length,0);assert.equal(s.poll('PC-03','key1').length,0);
 assert.equal(s.poll('PC-01','key1').length,1);
 s.poll('PC-01','key1',[{id,state:'read'}]);s.poll('PC-01','key1',[{id,state:'received'}]);
 const m=s.snapshot()[0];assert.equal(m.recipients[0].state,'read');assert.equal(m.recipients[1].state,'queued');assert.equal('key'in m.recipients[0],false);
});
test('messages expire and revocation prevents delivery even after reapproval',()=>{
 let now=1000;const s=createMessageStore({now:()=>now});s.create('test',targets);s.revoke('PC-01');assert.equal(s.poll('PC-01','key1').length,0);
 now+=300001;assert.equal(s.poll('PC-02','key2').length,0);assert.equal(s.snapshot()[0].recipients[1].state,'expired');
});
test('text, recipient and queue limits fail without evicting active messages',()=>{
 const s=createMessageStore({maxMessages:1});assert.throws(()=>s.create('',targets));assert.throws(()=>s.create('x'.repeat(2001),targets));assert.throws(()=>s.create('x',[targets[0],targets[0]]));
 s.create('first',targets);assert.throws(()=>s.create('second',targets),/full/);assert.equal(s.snapshot()[0].text,'first');
});
test('invalid acknowledgement batches are atomic',()=>{
 const s=createMessageStore();const id=s.create('test',targets);assert.throws(()=>s.poll('PC-01','key1',[{id,state:'read'},{id:'bad',state:'read'}]));assert.equal(s.snapshot()[0].recipients[0].state,'queued');
});
test('student inbox deduplicates immutable messages and keeps read acknowledgement during concurrent poll completion',()=>{
 const s=createMessageStore();s.create('<b>نص عادي</b>',targets);const m=s.poll('PC-01','key1');const i=createStudentInbox();i.accept(m);const sent=i.pending();i.read(m[0].id);i.confirm(sent);
 assert.equal(i.pending()[0].state,'read');i.accept([{...m[0],text:'changed'}]);assert.equal(i.snapshot()[0].text,'<b>نص عادي</b>');assert.equal(i.snapshot()[0].read,true);
});
test('received messages are redelivered after transient inbox loss, but read messages are not',()=>{
 const s=createMessageStore();s.create('hello',targets);const i=createStudentInbox();i.accept(s.poll('PC-01','key1'));s.poll('PC-01','key1',i.pending());i.clear();i.accept(s.poll('PC-01','key1'));assert.equal(i.snapshot().length,1);
 i.read(i.snapshot()[0].id);assert.equal(s.poll('PC-01','key1',i.pending()).length,0);
});
test('student inbox rejects an invalid batch before mutation, bounds storage and removes expired messages',()=>{
 let now=1000;const s=createMessageStore({now:()=>now}),i=createStudentInbox({now:()=>now});s.create('hello',targets);const m=s.poll('PC-01','key1');assert.throws(()=>i.accept([...m,{...m[0],id:'bad'}]));assert.equal(i.snapshot().length,0);
 i.accept(m);now+=300001;assert.equal(i.snapshot().length,0);assert.equal(i.pending().length,0);assert.equal(i.read(m[0].id),false);
});

test('new messages are not starved by repeated delivery of unread received messages',()=>{
 const s=createMessageStore();for(let n=0;n<11;n++)s.create('message '+n,[targets[0]]);
 const first=s.poll('PC-01','key1');assert.equal(first.length,10);
 const next=s.poll('PC-01','key1',first.map(m=>({id:m.id,state:'received'})));assert.equal(next[0].text,'message 10');
});
