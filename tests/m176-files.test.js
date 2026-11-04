const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createFileStore,validName,decodeFile,MAX_BYTES}=require('../classroom-files');
const target={id:'PC-01',publicKey:'key'},bytes=Buffer.from('نشاط تجريبي\n'),base64=bytes.toString('base64');
test('portable file names reject traversal, streams, reserved names, hidden and misleading control characters',()=>{
 for(const name of ['../a','a/b','a\\b','a:stream','CON.txt','LPT9','a.','a ','a\u202eb.exe','.hidden','a\0b'])assert.equal(validName(name),false,name);
 assert.equal(validName('نشاط 1.pdf'),true);assert.equal(validName('lesson.txt'),true);
});
test('data integrity enforces canonical base64, exact size and SHA256 including maximum file size',()=>{
 const hash=crypto.createHash('sha256').update(bytes).digest('hex');assert.deepEqual(decodeFile(base64,bytes.length,hash),bytes);
 assert.throws(()=>decodeFile(base64,bytes.length+1,hash));assert.throws(()=>decodeFile(base64,bytes.length,'f'.repeat(64)));assert.throws(()=>decodeFile(base64+'!'));assert.throws(()=>decodeFile(''));
 const maximum=Buffer.alloc(MAX_BYTES,3);assert.equal(decodeFile(maximum.toString('base64')).length,MAX_BYTES);assert.throws(()=>decodeFile(Buffer.alloc(MAX_BYTES+1).toString('base64')));
});
test('files bind recipients to approved keys; metadata never includes content or keys',()=>{
 const s=createFileStore(),f=s.create('lesson.txt',base64,[target]);assert.equal(s.poll(target.id,'wrong').length,0);assert.throws(()=>s.download(f.id,'other',target.publicKey));assert.equal(s.download(f.id,target.id,target.publicKey).base64,base64);
 assert.equal('base64'in s.snapshot()[0],false);assert.equal('data'in s.snapshot()[0],false);assert.equal('key'in s.snapshot()[0].recipients[0],false);
});
test('saved receipt requires download and cannot be downgraded',()=>{
 const s=createFileStore(),f=s.create('lesson.txt',base64,[target]);assert.throws(()=>s.acknowledge(f.id,target.id,target.publicKey,'saved'));
 s.acknowledge(f.id,target.id,target.publicKey,'downloaded');s.acknowledge(f.id,target.id,target.publicKey,'saved');s.acknowledge(f.id,target.id,target.publicKey,'downloaded');assert.equal(s.snapshot()[0].recipients[0].state,'saved');
});
test('revocation stops later downloads even for an already saved file and releases last-recipient bytes',()=>{
 const s=createFileStore(),f=s.create('lesson.txt',base64,[target]);s.acknowledge(f.id,target.id,target.publicKey,'downloaded');s.acknowledge(f.id,target.id,target.publicKey,'saved');s.revoke(target.id);assert.equal(s.poll(target.id,target.publicKey).length,0);assert.throws(()=>s.download(f.id,target.id,target.publicKey));assert.equal(s.snapshot()[0].recipients[0].state,'revoked');
});
test('expiry removes content and refuses stale download and saved receipts',()=>{
 let now=1000;const s=createFileStore({now:()=>now}),f=s.create('lesson.txt',base64,[target]);now+=300001;assert.equal(s.poll(target.id,target.publicKey).length,0);assert.throws(()=>s.download(f.id,target.id,target.publicKey));assert.throws(()=>s.acknowledge(f.id,target.id,target.publicKey,'saved'));assert.equal(s.snapshot()[0].recipients[0].state,'expired');
});
test('bounded file queue rejects excess active data and reuses expired history',()=>{
 let now=1000;const s=createFileStore({now:()=>now});for(let n=0;n<10;n++)s.create('lesson'+n,base64,[target]);assert.throws(()=>s.create('eleven',base64,[target]),/full/);now+=300001;assert.ok(s.create('new',base64,[target]).id);
});
