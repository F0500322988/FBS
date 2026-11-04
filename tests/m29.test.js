'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('M29 adapter is present but never enabled by UI or network',()=>{
 const root=path.join(__dirname,'../windows/FBS.Student.Native');
 const adapter=fs.readFileSync(path.join(root,'WindowsInputAdapter.cs'),'utf8');
 const ui=fs.readFileSync(path.join(root,'Program.cs'),'utf8');
 assert.match(adapter,/SendInput\(/);
 assert.match(adapter,/if \(!enabled\) return false/);
 assert.match(adapter,/internal void EnableForVerifiedSession/);
 assert.match(ui,/nativeInput\.Disable\(\)/);
 assert.doesNotMatch(ui,/EnableForVerifiedSession|\.MovePointer\(|\.TapLetter\(/);
});
