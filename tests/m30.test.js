'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('M30 disables native input on expiry, local disconnect, form closure and session stop',()=>{
 const root=path.join(__dirname,'../windows/FBS.Student.Native');
 const ui=fs.readFileSync(path.join(root,'Program.cs'),'utf8');
 const adapter=fs.readFileSync(path.join(root,'WindowsInputAdapter.cs'),'utf8');
 assert.match(ui,/DateTimeOffset\.UtcNow >= sessionExpiresAt/);
 assert.match(ui,/DateTimeOffset\.UtcNow - lastAgentContact > TimeSpan\.FromSeconds\(6\)/);
 assert.match(ui,/catch\s*\{[\s\S]*?ClearPending\(\);[\s\S]*?تعذر الاتصال بوكيل الطالب/);
 assert.match(ui,/FormClosed \+= \(_, _\) => \{ nativeInput\.Disable\(\); inputGate\.Deactivate\(\);/);
 assert.match(ui,/private void ClearPending\(\) \{ verifiedPipeline\.Stop\(\); nativeInput\.Disable\(\); inputGate\.Deactivate\(\);/);
 assert.match(adapter,/EnableForVerifiedSession\(bool explicitlyEnabledByOperator\)\s*=> enabled = false/);
});
