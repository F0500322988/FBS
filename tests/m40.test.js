const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../windows/FBS.Student.Native');
test('M40 native dry-run uses payload policy and consent gate',()=>{
 const s=fs.readFileSync(path.join(root,'InputDryRun.cs'),'utf8');
 assert.match(s,/PreviewPayloadPolicy\.Valid/);
 assert.match(s,/gate\.Accept/);
 assert.doesNotMatch(s,/SendInput\s*\(/);
});
test('M40 native UI routes preview through dry-run',()=>{
 const s=fs.readFileSync(path.join(root,'Program.cs'),'utf8');
 assert.match(s,/verifiedPipeline\.Preview\(item, id/);
});
test('M40 input injection remains forcibly disabled',()=>{
 const s=fs.readFileSync(path.join(root,'WindowsInputAdapter.cs'),'utf8');
 assert.match(s,/EnableForVerifiedSession\(bool explicitlyEnabledByOperator\)\s*=> enabled = false;/);
});
test('M40 native test covers consent replay and stop',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../windows/FBS.NativeGate.Tests/Program.cs'),'utf8');
 for(const marker of ['M40 rejects before consent','M40 rejects replay','M40 rejects after stop']) assert.ok(s.includes(marker));
});
