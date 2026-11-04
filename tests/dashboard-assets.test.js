const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {server}=require('../server');

test('dashboard serves HTML and every referenced script and stylesheet as actual file contents',async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const expected=await fs.readFile(path.join(__dirname,'../public/index.html'),'utf8');
  const response=await fetch(base+'/');
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type'),/^text\/html/);
  assert.equal(await response.text(),expected);
  const assets=[...expected.matchAll(/(?:src|href)="(\/[^" ]+)"/g)].map(match=>match[1]);
  assert.ok(assets.length>2,'exercise modular dashboard scripts as well as main assets');
  for(const asset of assets){
   const result=await fetch(base+asset);
   assert.equal(result.status,200,asset);
   assert.match(result.headers.get('content-type'),asset.endsWith('.js')?/^text\/javascript/:/^text\/css/);
   assert.equal(await result.text(),await fs.readFile(path.join(__dirname,'../public',asset.slice(1)),'utf8'),asset);
  }
  for(const restricted of ['/server.js','/enrollment.js','/data/enrollment.json','/package.json']){
   assert.equal((await fetch(base+restricted)).status,404,restricted);
  }
 }finally{await new Promise(resolve=>server.close(resolve));}
});
