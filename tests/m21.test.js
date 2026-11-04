'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {authorizedLocalRequest}=require('../local-control-auth');
const token='a'.repeat(64);
test('local control requires exact per-process secret and rejects browser origins',()=>{
 const req=(t,origin)=>({headers:{'x-fbs-local-token':t,...(origin?{origin}: {})}});
 assert.equal(authorizedLocalRequest(req(token),token),true);
 assert.equal(authorizedLocalRequest(req('b'.repeat(64)),token),false);
 assert.equal(authorizedLocalRequest(req(token,'http://evil.example'),token),false);
 assert.equal(authorizedLocalRequest(req(token),''),false);
 assert.equal(authorizedLocalRequest({headers:{}},token),false);
});
