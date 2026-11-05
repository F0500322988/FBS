'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {cleanAction,cleanDesktopAction,createAssistanceStore,createAssistanceReceiver}=require('../classroom-assistance');
test('desktop actions have exact schemas and no held keys across network',()=>{
 for(const c of [{type:'drag',dx:50,dy:0},{type:'click',button:'left'},{type:'click',button:'double'},{type:'click',button:'right'},{type:'scroll',steps:-5},{type:'key',key:'Enter',modifiers:[]},{type:'key',key:'C',modifiers:['primary']},{type:'lock'}])assert.deepEqual(cleanDesktopAction(c),c);
 for(const c of [{type:'drag',dx:501,dy:0},{type:'drag',dx:0,dy:0},{type:'click'},{type:'mousedown',button:'left'},{type:'keyup',key:'A'},{type:'scroll',steps:6},{type:'scroll',steps:0},{type:'key',key:'Power',modifiers:[]},{type:'key',key:'A',modifiers:['primary','primary']},{type:'key',key:'A',modifiers:['system']},{type:'key',key:'Enter',modifiers:'primary'},{type:'shell',command:'anything'}])assert.throws(()=>cleanDesktopAction(c));
 assert.deepEqual(cleanDesktopAction({type:'lock',unlock:true}),{type:'lock'});assert.throws(()=>cleanAction({type:'key',key:'Enter',modifiers:[]}));
});
test('old student capability never acquires expanded desktop commands',()=>{
 const d={id:'PC',publicKey:'key',assistanceSupported:true},s=createAssistanceStore(),a=s.start(d);s.decide(d.id,d.publicKey,a.sessionId,true);assert.equal(a.desktopControl,false);assert.throws(()=>s.submit(a.sessionId,a.controlToken,{type:'click',button:'left'},true));
});
test('desktop commands still require owner, local consent, current image and sequence',()=>{
 const d={id:'PC',publicKey:'key',assistanceSupported:true,assistanceVersion:2},s=createAssistanceStore(),a=s.start(d),c={type:'key',key:'A',modifiers:['primary']};assert.equal(a.desktopControl,true);assert.throws(()=>s.submit(a.sessionId,a.controlToken,c,true));s.decide(d.id,d.publicKey,a.sessionId,true);assert.throws(()=>s.submit(a.sessionId,a.controlToken,c,false));s.submit(a.sessionId,a.controlToken,c,true);
 const r=createAssistanceReceiver();r.accept({...s.poll(d.id,d.publicKey),status:'requested',commands:[]},r.revision);r.consent(a.sessionId);s.submit(a.sessionId,a.controlToken,c,true);r.accept(s.poll(d.id,d.publicKey),r.revision);assert.equal(r.take().commands[0].type,'key');r.close(a.sessionId);assert.equal(r.take(),null);
});
