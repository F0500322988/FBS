'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');const {spawn}=require('node:child_process');const {once}=require('node:events');
test('profile library API enforces login, origin, persistence, revisions and independent active settings', {timeout:20000},async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fbs-m179-api-')),file=path.join(dir,'lab.json');let child;
 t.after(async()=>{if(child&&child.exitCode===null){child.kill();await once(child,'exit');}fs.rmSync(dir,{recursive:true,force:true});});
 async function start(){child=spawn(process.execPath,['-e',"const s=require('./server').server;s.listen(0,'127.0.0.1',()=>process.send({port:s.address().port}));"],{cwd:path.join(__dirname,'..'),env:{...process.env,FBS_DEMO:'1',PORT:'0',FBS_TEACHER_PASSWORD:'m177-test-only-password',FBS_LAB_SETTINGS_FILE:file,FBS_ENROLLMENT_FILE:path.join(dir,'enrollment.json')},stdio:['ignore','ignore','pipe','ipc']});const [ready]=await Promise.race([once(child,'message'),once(child,'exit').then(()=>{throw Error('Teacher exited before ready');})]);return 'http://127.0.0.1:'+ready.port;}
 let base=await start();assert.equal((await fetch(base+'/api/lab-settings')).status,401);
 async function login(){const r=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:'m177-test-only-password'})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
 let cookie=await login();const request=async(method,body,origin)=>fetch(base+'/api/lab-settings',{method,headers:{Cookie:cookie,'Content-Type':'application/json',...(origin?{Origin:origin}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 const initial=await(await request('GET')).json();const updated={...initial,name:'معمل <script>نص عربي</script>',platform:'mixed',groups:[{id:crypto.randomUUID(),name:'المجموعة أ',deviceIds:['PC-01','MAC-02']}]};
 assert.equal((await request('PUT',updated,'https://evil.invalid')).status,403);assert.equal(fs.existsSync(file),false);
 const saved=await request('PUT',updated,'http://127.0.0.1:0');assert.equal(saved.status,200);assert.equal((await saved.json()).revision,1);const bytes=fs.readFileSync(file);
 assert.equal((await request('PUT',updated)).status,409);assert.deepEqual(fs.readFileSync(file),bytes);
 assert.equal((await request('POST',updated)).status,405);
 const status=await(await fetch(base+'/api/status',{headers:{Cookie:cookie}})).json();assert.equal(status.lab.name,updated.name);assert.equal(status.features.labManagement,true);assert.equal(status.students.every(s=>s.approved===false),true,'groups do not approve demo devices');
 child.kill();await once(child,'exit');base=await start();cookie=await login();assert.deepEqual((await(await request('GET')).json()).groups,updated.groups);
 assert.equal((await request('PUT',{...updated,revision:1,groups:[{...updated.groups[0],deviceIds:['../bad']}]})).status,400);assert.deepEqual(fs.readFileSync(file),bytes);
 const profilesUrl=()=>base+'/api/lab-profiles';
 assert.equal((await fetch(profilesUrl())).status,401);
 const profiles=async(method,body,origin)=>fetch(profilesUrl(),{method,headers:{Cookie:cookie,'Content-Type':'application/json',...(origin?{Origin:origin}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 const library=await(await profiles('GET')).json(),profile={id:crypto.randomUUID(),name:'معمل Mac',platform:'macos',groups:updated.groups};
 const next={...library,profiles:[profile]};
 assert.equal((await profiles('PUT',next,'https://evil.invalid')).status,403);assert.equal((await profiles('POST',next)).status,405);
 let savedLibrary=await profiles('PUT',next);assert.equal(savedLibrary.status,200);savedLibrary=await savedLibrary.json();assert.equal(savedLibrary.revision,1);assert.deepEqual(fs.readFileSync(file),bytes,'saving a profile must not apply it to the active lab');
 assert.equal((await profiles('PUT',next)).status,409);
 child.kill();await once(child,'exit');base=await start();cookie=await login();assert.deepEqual((await(await profiles('GET')).json()).profiles,[profile]);
 assert.equal((await profiles('PUT',{...savedLibrary,profiles:[profile,{...profile,id:crypto.randomUUID()}]})).status,400);
 const libraryFile=path.join(dir,'lab-profiles.json');fs.writeFileSync(libraryFile,'{ corrupt library');assert.equal((await profiles('GET')).status,503);assert.equal((await profiles('PUT',{...savedLibrary,profiles:[]})).status,503);assert.equal(fs.readFileSync(libraryFile,'utf8'),'{ corrupt library');assert.equal((await request('GET')).status,200,'corrupt library must not block current lab');
 fs.writeFileSync(file,'{ damaged original');assert.equal((await request('GET')).status,503);assert.equal((await request('PUT',{...updated,revision:1})).status,503);assert.equal(fs.readFileSync(file,'utf8'),'{ damaged original');
 const unavailable=await(await fetch(base+'/api/status',{headers:{Cookie:cookie}})).json();assert.equal(unavailable.lab.settingsAvailable,false);
});
