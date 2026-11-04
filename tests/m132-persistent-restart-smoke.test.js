const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const smoke = fs.readFileSync(path.join(root, 'windows/FBS.NativeSafety.Smoke/Program.cs'), 'utf8');
const csproj = fs.readFileSync(path.join(root, 'windows/FBS.NativeSafety.Smoke/FBS.NativeSafety.Smoke.csproj'), 'utf8');
const script = fs.readFileSync(path.join(root, 'windows/Test-M132-Persistent-Restart.ps1'), 'utf8');
const adapter = fs.readFileSync(path.join(root, 'windows/FBS.Student.Native/WindowsInputAdapter.cs'), 'utf8');
const ledger = fs.readFileSync(path.join(root, 'windows/FBS.Student.Native/PersistentStopLedger.cs'), 'utf8');
const cases = [
 ['compiles real persistent ledger into smoke project', () => assert.match(csproj, /PersistentStopLedger\.cs/)],
 ['runtime smoke invokes restart test', () => assert.match(smoke, /TestPersistentLedgerRestart\(\)/)],
 ['test uses isolated temp folder', () => assert.match(smoke, /Path\.GetTempPath\(\)/)],
 ['test records first stop', () => assert.match(smoke, /first\.Stop\("session-before-restart"\)/)],
 ['test records second stop', () => assert.match(smoke, /first\.Stop\("session-second-stop"\)/)],
 ['test reopens ledger after restart', () => assert.match(smoke, /afterRestart = new PersistentStopLedger\(path\)/)],
 ['test checks both stops survive restart', () => { assert.match(smoke, /afterRestart\.WasStopped\("session-before-restart"\)/); assert.match(smoke, /afterRestart\.WasStopped\("session-second-stop"\)/); }],
 ['test checks a new session remains eligible', () => assert.match(smoke, /!afterRestart\.WasStopped\("new-authorized-session"\)/)],
 ['test checks second restart', () => assert.match(smoke, /third\.WasStopped\("session-after-restart"\)/)],
 ['test corrupts isolated file', () => assert.match(smoke, /File\.WriteAllText\(path, "\{broken-json"\)/)],
 ['test rejects corrupted ledger', () => assert.match(smoke, /corrupt\.LockedDown/)],
 ['test rejects all sessions on corruption', () => assert.match(smoke, /corrupt\.WasStopped\("new-authorized-session"\)/)],
 ['test does not silently overwrite corrupted ledger', () => assert.match(smoke, /!corrupt\.Stop\("another-session"\)/)],
 ['script runs Windows C# project', () => assert.match(script, /dotnet run --project/)],
 ['script fails on nonzero result', () => assert.match(script, /LASTEXITCODE -ne 0/)],
 ['native adapter stays disabled', () => assert.match(adapter, /enabled = false/)],
 ['persistent ledger fails closed on read errors', () => assert.match(ledger, /catch \(Exception\) \{ LockedDown = true; \}/)],
];
for (const [name, fn] of cases) test('M132: ' + name, fn);
