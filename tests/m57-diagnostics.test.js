'use strict';
const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('node:fs'); const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../windows/Test-M57-Diagnostics.ps1'),'utf8');
test('M57 emits diagnostic report even when prerequisites fail',()=>{assert.match(script,/finally\s*\{/);assert.match(script,/ConvertTo-Json/);assert.match(script,/Set-Content -Path \$reportFile/)});
test('M57 checks .NET 8 and three C# projects',()=>{assert.match(script,/--list-sdks/);assert.match(script,/FBS\.NativeGate\.Tests/);assert.match(script,/FBS\.Student\.Native/);assert.match(script,/FBS\.Teacher\.Launcher/)});
test('M57 does not enable live input',()=>{assert.match(script,/inputExecutionEnabled=\$false/);assert.doesNotMatch(script,/EnableForVerifiedSession\s*\(/)});
test('M57 runs M56 build only after prerequisite checks pass',()=>{assert.match(script,/if \(\$report\.checks \| Where-Object/);assert.match(script,/Test-M56-Windows\.ps1/)});
