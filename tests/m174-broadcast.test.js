'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createBroadcastStore,createBroadcastReceiver,jpegDimensions}=require('../classroom-broadcast');
const bytes=fs.readFileSync(path.join(__dirname,'fixtures/m174-frame.jpg')),jpeg='data:image/jpeg;base64,'+bytes.toString('base64');
const target={id:'PC-01',publicKey:'approved-key'};
test('broadcast JPEG validation checks format, byte cap, dimensions and bounded marker segments',()=>{
 assert.deepEqual(jpegDimensions(jpeg),{width:16,height:9});
 for(const bad of ['data:text/html;base64,AAAA','data:image/jpeg;base64,/9j/2Q==',jpeg+'AAAA','data:image/jpeg;base64,'+'A'.repeat(170001)])assert.throws(()=>jpegDimensions(bad));
 const huge=Buffer.from(bytes),sof=huge.indexOf(Buffer.from([255,192]));assert.ok(sof>0);huge.writeUInt16BE(65535,sof+7);assert.throws(()=>jpegDimensions('data:image/jpeg;base64,'+huge.toString('base64')),/dimensions/);
});
test('broadcast sends fresh frames only to selected matching approved keys and rejects old sequences',()=>{
 const s=createBroadcastStore(),state=s.start([target]);assert.throws(()=>s.start([target]),/active/);assert.equal(s.poll(target.id,target.publicKey),null);
 s.publish({sessionId:state.id,sequence:1,jpeg});assert.equal(s.poll(target.id,target.publicKey).jpeg,jpeg);assert.equal(s.poll(target.id,'other'),null);assert.equal(s.poll('other',target.publicKey),null);
 assert.throws(()=>s.publish({sessionId:state.id,sequence:1,jpeg}),/Outdated/);assert.throws(()=>s.publish({sessionId:'wrong',sequence:2,jpeg}));assert.equal(s.state().sequence,1);
});
test('freshness and 15 minute lease expire without any stop request',()=>{
 let now=1000;const s=createBroadcastStore({now:()=>now}),state=s.start([target]);s.publish({sessionId:state.id,sequence:1,jpeg});now+=3500;assert.equal(s.poll(target.id,target.publicKey),null);assert.equal(s.state().frameFresh,false);
 now+=900000;assert.equal(s.state().active,false);assert.throws(()=>s.publish({sessionId:state.id,sequence:2,jpeg}));
});
test('stop is idempotent and late stop/frame requests cannot end or resurrect a newer session',()=>{
 const s=createBroadcastStore(),first=s.start([target]);assert.equal(s.stop(first.id),true);assert.equal(s.stop(first.id),true);const second=s.start([target]);assert.equal(s.stop(first.id),false);assert.equal(s.state().id,second.id);assert.throws(()=>s.publish({sessionId:first.id,sequence:4,jpeg}));
});
test('revoking last recipient stops broadcast and other keys never gain delivery',()=>{
 const s=createBroadcastStore(),state=s.start([target]);s.publish({sessionId:state.id,sequence:1,jpeg});s.revoke(target.id);assert.equal(s.state().active,false);assert.equal(s.poll(target.id,target.publicKey),null);
});
test('invalid recipient sets never create a session',()=>{
 const s=createBroadcastStore();for(const targets of [[],[target,target],[{id:'../bad',publicKey:'key'}],Array.from({length:41},(_,i)=>({id:'PC'+i,publicKey:'key'}))])assert.throws(()=>s.start(targets));assert.deepEqual(s.state(),{active:false});
});
test('student clears on expiry/null/failure and a duplicate frame cannot refresh its lifetime',()=>{
 let now=1000;const s=createBroadcastStore({now:()=>now}),r=createBroadcastReceiver({now:()=>now}),state=s.start([target]);s.publish({sessionId:state.id,sequence:1,jpeg});const frame=s.poll(target.id,target.publicKey);r.accept(frame);
 now+=3000;r.accept(frame);now+=501;assert.equal(r.snapshot(),null);r.accept(frame);assert.equal(r.snapshot(),null);
 s.publish({sessionId:state.id,sequence:2,jpeg});r.accept(s.poll(target.id,target.publicKey));assert.equal(r.snapshot().sequence,2);r.clear();assert.equal(r.snapshot(),null);
});
test('student rejects malformed payloads and validates image data before retaining it',()=>{
 const r=createBroadcastReceiver();assert.throws(()=>r.accept({sessionId:'bad',sequence:1,expiresAt:Date.now()+1000,jpeg}));assert.throws(()=>r.accept({sessionId:'00000000-0000-0000-0000-000000000000',sequence:1,expiresAt:Date.now()+1000,jpeg:'bad'}));assert.equal(r.snapshot(),null);
});
