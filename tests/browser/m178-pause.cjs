'use strict';
// Optional browser acceptance: node tests/browser/m178-pause.cjs (Playwright + Chromium).
const {chromium}=require('playwright');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const publicRoot=path.resolve(__dirname,'../../public');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.FBS_BROWSER_EXECUTABLE?{executablePath:process.env.FBS_BROWSER_EXECUTABLE}:{}),args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  let statusFail=false,framesFail=false,devices=[],frameMode='fresh',messages=[],messageFail=false,sends=[],broadcast={active:false},captured=[],startCalls=0,frameFail=false,deliveredFiles=[],fileSends=[],fileFail=false;
  let lab={version:1,revision:0,name:'معمل الاختبار',platform:'windows',groups:[]},labConflict=false,labUnavailable=false;
  let pause={active:false,recipients:[]},pauseFail=false,pauseStarts=[],pauseTouches=0,pauseDelayStart=false,pauseResolveStart;
  const image='data:image/jpeg;base64,/9j/2Q==';
  await page.route('http://localhost:41999/**',async route=>{
   const url=new URL(route.request().url());let body,type='application/json',status=200;
   if(url.pathname==='/api/auth')body={required:false};
   else if(url.pathname==='/api/lab-profiles')body={version:1,revision:0,profiles:[]};
   else if(url.pathname==='/api/lab-settings'){
    if(labUnavailable){status=503;body={error:'unavailable'};}
    else if(route.request().method()==='PUT'){const data=route.request().postDataJSON();if(labConflict||data.revision!==lab.revision){status=409;body={error:'changed'};}else{lab={...data,revision:lab.revision+1};body=lab;}}
    else body=lab;
   }
   else if(url.pathname==='/api/status'){status=statusFail?503:200;body={mode:'live',lab:{name:'معمل الاختبار'},students:devices};}
   else if(url.pathname==='/api/frames'){status=framesFail?503:200;body={frames:devices.map(d=>({id:d.id,jpeg:image,at:Date.now()-(frameMode==='stale'?6000:0)}))};}
   else if(url.pathname==='/api/messages'){
    if(route.request().method()==='POST'){
     const data=route.request().postDataJSON();sends.push(data);status=messageFail?409:202;
     if(!messageFail)messages.unshift({id:'browser-test',text:data.text,recipients:data.deviceIds.map(id=>({id,state:'queued'}))});body={id:'browser-test'};
    }else body={messages};
   }
   else if(url.pathname.startsWith('/api/pause')){
    const data=route.request().method()==='POST'?route.request().postDataJSON():null;
    if(url.pathname.endsWith('/start')){pauseStarts.push(data);pause={active:true,sessionId:require('node:crypto').randomUUID(),expiresAt:Date.now()+data.seconds*1000,recipients:data.deviceIds.map(id=>({id,state:'requested'}))};status=201;if(pauseDelayStart)await new Promise(resolve=>pauseResolveStart=resolve);}
    if(url.pathname.endsWith('/keepalive')){pauseTouches++;if(pauseFail)status=503;}
    if(url.pathname.endsWith('/stop'))pause={...pause,active:false,recipients:pause.recipients.map(r=>({...r,state:'stopped'}))};
    body=pause;
   }
   else if(url.pathname==='/api/files'){
    if(route.request().method()==='POST'){
     const data=route.request().postDataJSON();fileSends.push(data);status=fileFail?409:202;if(!fileFail)deliveredFiles.unshift({id:'test-file',name:data.name,size:Buffer.from(data.base64,'base64').length,recipients:data.deviceIds.map(id=>({id,state:'queued'}))});body={id:'test-file'};
    }else body={files:deliveredFiles};
   }
   else if(url.pathname.startsWith('/api/broadcast')){
    const data=route.request().method()==='POST'?route.request().postDataJSON():null;
    if(url.pathname.endsWith('/start')){startCalls++;broadcast={active:true,id:'00000000-0000-0000-0000-000000000001',deviceIds:data.deviceIds,expiresAt:Date.now()+900000};status=201;}
    if(url.pathname.endsWith('/frame')){captured.push(data);status=frameFail?503:202;}
    if(url.pathname.endsWith('/stop'))broadcast={active:false};
    body=url.pathname.endsWith('/frame')?{accepted:!frameFail}:broadcast;
   }
   else if(url.pathname==='/api/enrollment/devices')body={devices:[]};
   else {const file=url.pathname==='/'?'index.html':url.pathname.slice(1);if(!/^[\w.-]+$/.test(file))throw Error('Unexpected route');body=fs.readFileSync(path.join(publicRoot,file));type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html';}
   await route.fulfill({status,contentType:type,body:Buffer.isBuffer(body)?body:JSON.stringify(body)});
  });
  // HTML must be sent as raw bytes by the static mock.
  await page.goto('http://localhost:41999/');
  await page.waitForFunction(()=>document.querySelector('#lab-name').textContent==='معمل الاختبار');
  assert.equal(await page.locator('#total').textContent(),'0');assert.match(await page.locator('#empty-state').textContent(),/لا توجد أجهزة/);
  devices=[{id:'PC-01',online:true,approved:true,platform:'Windows',ip:'127.0.0.1'},{id:'PC-02',online:false,approved:true}];
  await page.evaluate(()=>refresh());
  assert.equal(await page.locator('#devices .device').count(),2);assert.equal(await page.locator('#devices img').count(),0);
  await page.click('#view-list');assert.equal(await page.locator('#view-list').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#devices.list-view').count(),1);
  await page.fill('#search','missing');assert.match(await page.locator('#empty-state').textContent(),/تطابق البحث/);await page.fill('#search','');
  await page.click('nav [data-page="screens"]');await page.waitForFunction(()=>!refreshBusy);
  assert.equal(await page.locator('#devices img').count(),1,'offline devices never show previews');
  devices[0].approved=false;await page.evaluate(()=>refresh());assert.equal(await page.locator('#devices img').count(),0,'unapproved devices never show previews');
  devices[0].approved=true;await page.evaluate(()=>refresh());
  await page.locator('#devices .has-preview').press('Enter');assert.equal(await page.locator('#screen-dialog').evaluate(x=>x.open),true);
  framesFail=true;await page.evaluate(()=>refresh());assert.equal(await page.locator('#devices img').count(),0);assert.equal(await page.locator('#screen-large').getAttribute('src'),null);assert.match(await page.locator('#notice').textContent(),/تعذر تحديث/);
  framesFail=false;frameMode='stale';await page.evaluate(()=>refresh());assert.equal(await page.locator('#devices img').count(),0,'expired frames must not render');
  await page.click('#screen-close');await page.click('nav [data-page="control"]');assert.equal(await page.locator('#devices .device').count(),0);assert.match(await page.locator('#notice').textContent(),/غير متاحة/);
  await page.click('nav [data-page="home"]');await page.waitForFunction(()=>!refreshBusy);
  statusFail=true;await page.evaluate(()=>refresh());assert.equal(await page.locator('#total').textContent(),'—');assert.equal(await page.locator('#devices .device').count(),0);assert.match(await page.locator('#mode').textContent(),/تعذر/);
  statusFail=false;await page.evaluate(()=>refresh());assert.equal(await page.locator('#total').textContent(),'2');
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile must fit viewport');
  await page.setViewportSize({width:1280,height:900});
  devices.push({id:'PC-03',online:true,approved:false});await page.evaluate(()=>refresh());
  await page.click('nav [data-page="messages"]');await page.waitForFunction(()=>!refreshBusy);
  assert.equal(await page.locator('#message-recipients input').count(),1,'only online approved devices are selectable');
  assert.equal(await page.locator('#message-send').isDisabled(),true);
  await page.fill('#message-text','تعليمات <script>window.BAD=true</script>');await page.click('#message-select-all');
  assert.equal(await page.locator('#message-send').isEnabled(),true);await page.click('#message-send');
  await page.waitForFunction(()=>!messageSending);assert.deepEqual(sends[0].deviceIds,['PC-01']);
  assert.match(await page.locator('#message-history').textContent(),/<script>/);assert.equal(await page.evaluate(()=>window.BAD),undefined);
  assert.equal(await page.locator('#message-history script').count(),0);
  messages[0].recipients[0].state='read';await page.evaluate(()=>loadMessageHistory());assert.match(await page.locator('#message-history').textContent(),/أكد الطالب/);
  messageFail=true;await page.fill('#message-text','try again');await page.click('#message-send');await page.waitForFunction(()=>!messageSending);assert.match(await page.locator('#message-result').textContent(),/اتصال الأجهزة/);
  devices[0].approved=false;await page.evaluate(()=>refresh());assert.equal(await page.locator('#message-recipients input').count(),0);assert.equal(await page.locator('#message-send').isDisabled(),true);
  devices[0].approved=true;await page.evaluate(()=>refresh());
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.setViewportSize({width:1280,height:900});
  await page.evaluate(()=>{
   window.fbsTracks=[];
   Object.defineProperty(navigator.mediaDevices,'getDisplayMedia',{configurable:true,value:async()=>{
    if(window.fbsDenyCapture)throw new DOMException('Denied','NotAllowedError');
    if(window.fbsDelayCapture)await new Promise(resolve=>window.fbsResolveCapture=resolve);
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const ctx=canvas.getContext('2d');ctx.fillStyle='#1766d6';ctx.fillRect(0,0,640,360);
    const stream=canvas.captureStream(2);window.fbsTracks.push(...stream.getTracks());return stream;
   }});
  });
  await page.click('nav [data-page="broadcast"]');await page.waitForFunction(()=>!refreshBusy&&!broadcastStateBusy);
  assert.equal(await page.locator('#broadcast-recipients input').count(),1);await page.click('#broadcast-all');
  await page.click('#broadcast-start');await page.waitForFunction(()=>broadcastSequence>0&&!broadcastSending&&!broadcastBusy);
  assert.equal(startCalls,1);assert.deepEqual(broadcast.deviceIds,['PC-01']);assert.ok(captured.length>0);
  const {jpegDimensions}=require('../../classroom-broadcast');assert.deepEqual(jpegDimensions(captured[0].jpeg),{width:1280,height:720});
  assert.equal(await page.locator('#broadcast-preview').isVisible(),true);
  await page.click('#broadcast-stop');await page.waitForFunction(()=>!broadcastSession&&document.querySelector('#broadcast-state').textContent==='تم إيقاف مشاركة الشاشة');
  assert.equal(broadcast.active,false);assert.equal(await page.evaluate(()=>window.fbsTracks.every(t=>t.readyState==='ended')),true);
  await page.evaluate(()=>window.fbsDenyCapture=true);await page.click('#broadcast-start');await page.waitForFunction(()=>!broadcastBusy);assert.equal(startCalls,1);assert.match(await page.locator('#broadcast-state').textContent(),/رُفض الإذن/);
  await page.evaluate(()=>{window.fbsDenyCapture=false;window.fbsDelayCapture=true;});await page.click('#broadcast-start');await page.click('#broadcast-stop');
  await page.evaluate(()=>window.fbsResolveCapture());await page.waitForFunction(()=>window.fbsTracks.every(t=>t.readyState==='ended'));assert.equal(startCalls,1,'cancelled chooser must never create a server session');
  await page.evaluate(()=>window.fbsDelayCapture=false);await page.click('#broadcast-start');await page.waitForFunction(()=>broadcastSequence>0&&!broadcastBusy&&!broadcastSending);
  await page.click('nav [data-page="home"]');await page.waitForFunction(()=>!broadcastSession);assert.equal(await page.evaluate(()=>window.fbsTracks.every(t=>t.readyState==='ended')),true);
  await page.click('nav [data-page="broadcast"]');await page.waitForFunction(()=>!refreshBusy&&!broadcastStateBusy);await page.click('#broadcast-all');frameFail=true;
  await page.click('#broadcast-start');await page.waitForFunction(()=>!broadcastBusy&&!broadcastStream);assert.equal(await page.evaluate(()=>window.fbsTracks.every(t=>t.readyState==='ended')),true);
  assert.equal(broadcast.active,false);frameFail=false;
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.click('nav [data-page="files"]');await page.waitForFunction(()=>!refreshBusy&&!fileHistoryBusy);
  assert.equal(await page.locator('#file-recipients input').count(),1);assert.equal(await page.locator('#file-send').isDisabled(),true);
  await page.locator('#file-input').setInputFiles({name:'نشاط.txt',mimeType:'text/plain',buffer:Buffer.from('FBS worksheet')});await page.click('#file-all');assert.equal(await page.locator('#file-send').isEnabled(),true);
  await page.click('#file-send');await page.waitForFunction(()=>!fileSending);assert.deepEqual(fileSends[0].deviceIds,['PC-01']);assert.equal(Buffer.from(fileSends[0].base64,'base64').toString(),'FBS worksheet');
  deliveredFiles[0].recipients[0].state='saved';await page.evaluate(()=>loadFileHistory());assert.match(await page.locator('#file-history').textContent(),/أكد تطبيق الطالب الحفظ/);
  const before=fileSends.length;await page.locator('#file-input').setInputFiles({name:'big.bin',mimeType:'application/octet-stream',buffer:Buffer.alloc(5*1024*1024+1)});await page.click('#file-send');assert.equal(fileSends.length,before);assert.match(await page.locator('#file-result').textContent(),/5 ميجابايت/);
  await page.locator('#file-input').setInputFiles({name:'retry.txt',mimeType:'text/plain',buffer:Buffer.from('retry')});fileFail=true;await page.click('#file-send');await page.waitForFunction(()=>!fileSending);assert.match(await page.locator('#file-result').textContent(),/اعتمادها/);
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.setViewportSize({width:1280,height:900});await page.evaluate(()=>window.scrollTo(0,0));
  if(process.env.FBS_SCREENSHOT)await page.screenshot({path:process.env.FBS_SCREENSHOT,fullPage:true});
  await page.click('nav [data-page="labs"]');await page.waitForFunction(()=>!refreshBusy&&!labBusy);
  assert.equal(await page.locator('#labs-panel').isVisible(),true);
  await page.fill('#lab-title','معمل الحاسب العربي');await page.selectOption('#lab-platform','mixed');await page.click('#lab-add-group');
  await page.getByRole('textbox',{name:'اسم المجموعة',exact:true}).fill('مجموعة <script>نص</script>');
  await page.getByRole('textbox',{name:'معرّفات أجهزة المجموعة',exact:true}).fill('PC-01, PC-02');
  await page.evaluate(()=>refresh());assert.equal(await page.locator('#lab-title').inputValue(),'معمل الحاسب العربي','polling must preserve unsaved edits');
  await page.click('#lab-save');await page.waitForFunction(()=>!labSaving);assert.match(await page.locator('#lab-result').textContent(),/حُفظت/);assert.equal(lab.revision,1);assert.deepEqual(lab.groups[0].deviceIds,['PC-01','PC-02']);
  assert.equal(await page.locator('#lab-group-filter script').count(),0);const groupId=lab.groups[0].id;
  devices=[{id:'PC-01',online:true,approved:true},{id:'PC-02',online:false,approved:true},{id:'PC-03',online:true,approved:true}];await page.evaluate(()=>refresh());
  await page.selectOption('#lab-group-filter',groupId);await page.click('nav [data-page="home"]');await page.waitForFunction(()=>!refreshBusy);assert.equal(await page.locator('#devices .device').count(),2);
  await page.click('nav [data-page="messages"]');await page.waitForFunction(()=>!refreshBusy);assert.equal(await page.locator('#message-recipients input').count(),1);await page.click('#message-select-all');await page.fill('#message-text','إلى مجموعة محددة');messageFail=false;await page.click('#message-send');await page.waitForFunction(()=>!messageSending);assert.deepEqual(sends.at(-1).deviceIds,['PC-01']);
  await page.click('nav [data-page="files"]');await page.waitForFunction(()=>!refreshBusy);assert.equal(await page.locator('#file-recipients input').count(),1);
  await page.click('nav [data-page="broadcast"]');await page.waitForFunction(()=>!refreshBusy&&!broadcastStateBusy);assert.equal(await page.locator('#broadcast-recipients input').count(),1);
  await page.click('nav [data-page="labs"]');await page.waitForFunction(()=>!refreshBusy);labConflict=true;await page.fill('#lab-title','تعديل متعارض');await page.click('#lab-save');await page.waitForFunction(()=>!labSaving);assert.match(await page.locator('#lab-result').textContent(),/تغيرت/);assert.equal(lab.name,'معمل الحاسب العربي');labConflict=false;
  page.once('dialog',d=>d.accept());await page.click('#lab-reload');await page.waitForFunction(()=>!labBusy);assert.equal(await page.locator('#lab-title').inputValue(),'معمل الحاسب العربي');
  await page.reload();await page.waitForFunction(()=>!refreshBusy&&labDraft!==null);assert.equal(await page.locator('#lab-group-filter option').count(),2);await page.click('nav [data-page="labs"]');await page.waitForFunction(()=>!refreshBusy);assert.equal(await page.locator('#lab-title').inputValue(),'معمل الحاسب العربي');
  if(process.env.FBS_BROWSER_SCREENSHOT)await page.screenshot({path:process.env.FBS_BROWSER_SCREENSHOT,fullPage:true});
  await page.selectOption('#lab-group-filter',groupId);labUnavailable=true;await page.evaluate(()=>refresh());await page.click('nav [data-page="files"]');await page.waitForFunction(()=>!refreshBusy);assert.equal(await page.locator('#file-recipients input').count(),0,'unavailable selected group must not expand to all recipients');labUnavailable=false;
  await page.click('nav [data-page="labs"]');await page.waitForFunction(()=>!refreshBusy);await page.getByRole('button',{name:'حذف المجموعة',exact:true}).click();await page.click('#lab-save');await page.waitForFunction(()=>!labSaving);assert.equal(lab.groups.length,0);
  await page.selectOption('#lab-group-filter','');await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'lab editor fits mobile');await page.setViewportSize({width:1280,height:900});
  devices=[{id:'PC-01',online:true,approved:true},{id:'PC-02',online:false,approved:true},{id:'PC-03',online:true,approved:false}];await page.evaluate(()=>refresh());
  await page.click('nav [data-page="lock"]');await page.waitForFunction(()=>!refreshBusy&&!pauseLoading);assert.equal(await page.locator('#pause-panel').isVisible(),true);assert.equal(await page.locator('#pause-recipients input').count(),1);assert.equal(await page.locator('#pause-start').isDisabled(),true);
  await page.click('#pause-all');await page.click('#pause-start');await page.waitForFunction(()=>!pauseBusy&&pauseOwned);assert.deepEqual(pauseStarts.at(-1),{deviceIds:['PC-01'],seconds:60});assert.equal(await page.locator('#lab-group-filter').isDisabled(),true);assert.equal(await page.locator('#pause-duration').isDisabled(),true);
  pause.recipients[0].state='displayed';await page.evaluate(()=>loadPauseState());assert.match(await page.locator('#pause-receipts').textContent(),/أكد تطبيق الطالب/);
  await page.waitForFunction(()=>pauseTouching===false);await page.waitForTimeout(2800);assert.ok(pauseTouches>0);
  await page.click('#pause-stop');await page.waitForFunction(()=>!pauseSession);assert.equal(pause.active,false);assert.equal(await page.locator('#lab-group-filter').isEnabled(),true);
  await page.click('#pause-start');await page.waitForFunction(()=>!pauseBusy&&pauseOwned);await page.click('nav [data-page="home"]');await page.waitForFunction(()=>!pauseOwned&&!pauseSession);await page.waitForTimeout(100);assert.equal(pause.active,false,'navigation must stop teacher pause');
  await page.click('nav [data-page="lock"]');await page.waitForFunction(()=>!refreshBusy&&!pauseLoading);pauseDelayStart=true;await page.click('#pause-start');await page.waitForTimeout(100);await page.click('nav [data-page="home"]');pauseResolveStart();await page.waitForFunction(()=>!pauseBusy);assert.equal(pause.active,false,'delayed start after navigation must be stopped');pauseDelayStart=false;
  await page.click('nav [data-page="lock"]');await page.waitForFunction(()=>!refreshBusy&&!pauseLoading);await page.click('#pause-start');await page.waitForFunction(()=>!pauseBusy&&pauseOwned);pauseFail=true;await page.waitForFunction(()=>!pauseOwned,{},{timeout:7000});assert.equal(await page.evaluate(()=>pauseOwned),false,'failed heartbeat stops renewal');pauseFail=false;await page.click('#pause-stop');await page.waitForFunction(()=>!pauseSession);
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'pause panel fits mobile');await page.setViewportSize({width:1280,height:900});
  if(process.env.FBS_PAUSE_SCREENSHOT)await page.screenshot({path:process.env.FBS_PAUSE_SCREENSHOT,fullPage:true});
  assert.deepEqual(errors,[]);console.log('M178 browser acceptance passed: pause eligibility, start/stop, keepalive, navigation cancellation, delayed start cleanup, offline renewal failure; regression: persistent lab editor, unsaved edits, conflict/reload, group filtering, recipient safety and unavailable-group fail-closed; regression: file recipient eligibility, browser file upload, receipt states, size rejection before POST, send failure and mobile layout; previous checks: canvas MediaStream capture and JPEG upload, chooser rejection/cancellation, stop/navigation/failure track cleanup; previous checks: message recipients, text-only rendering, queued/read states, send failure, revoke and mobile layout; regression: empty/search/list, live roster, consent/online/fresh previews, HTTP failure cleanup, unavailable features, recovery, mobile layout, no JS errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
