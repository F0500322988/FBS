const {test}=require('node:test');
const assert=require('node:assert/strict');
const {isPin,storedKey,storedPassword}=require('../credential-policy');
const {sessionKey}=require('../authenticated-preview-transport');
test('new credentials require exactly eight ASCII digits, retaining leading zero',()=>{
 assert.equal(isPin('01234567'),true);
 for(const value of ['1234567','123456789','abcdefgh','1234 678','12345678\n','',null]) assert.equal(isPin(value),false);
});
test('stored credentials accept numeric PINs and preserve existing deployments',()=>{
 for(const validate of [storedKey,storedPassword]) {
  assert.equal(validate('01234567'),true); assert.equal(validate('existing-legacy-password'),true);
  for(const value of ['abcdefgh','1234567','123456789',null]) assert.equal(validate(value),false);
 }
});
test('authenticated command transport derives keys from eight digit lab PINs',()=>{
 const key=sessionKey('01234567','student-fixture','session-fixture');
 assert.equal(key.length,32);
 assert.notDeepEqual(key,sessionKey('01234568','student-fixture','session-fixture'));
 assert.throws(()=>sessionKey('abcdefgh','student-fixture','session-fixture'));
});
