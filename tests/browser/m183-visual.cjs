'use strict';
// Optional browser acceptance: node tests/browser/m183-reference.cjs (Playwright + Chromium).
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
  let library={version:1,revision:0,profiles:[]},profileConflict=false,profileUnavailable=false;
  let assistance={status:'idle'},assistCommands=[],assistFail=false,assistTouches=0;
  let power={operations:[],wakeDevices:[]},powerSends=[],powerFail=false;
  const image='data:image/jpeg;base64,'+fs.readFileSync(path.resolve(__dirname,'../fixtures/m174-frame.jpg')).toString('base64');
  await page.route('http://localhost:41999/**',async route=>{
   const url=new URL(route.request().url());let body,type='application/json',status=200;
   if(url.pathname==='/api/auth')body={required:false};
   else if(url.pathname.startsWith('/api/assist')){
    const data=route.request().method()==='POST'?route.request().postDataJSON():null;
    if(url.pathname.endsWith('/start')){assistance={status:'requested',desktopControl:true,sessionId:require('node:crypto').randomUUID(),deviceId:data.deviceId,controlToken:'cd'.repeat(32)};status=201;body=assistance;}
    else if(url.pathname.endsWith('/command')){assistCommands.push(data);status=202;body={sequence:assistCommands.length,status:'queued'};}
    else {if(url.pathname.endsWith('/keepalive')){assistTouches++;if(assistFail)status=503;}if(url.pathname.endsWith('/stop'))assistance={...assistance,status:'stopped'};const {controlToken,...safe}=assistance;body=safe;}
   }
   else if(url.pathname.startsWith('/api/power')){
    if(powerFail){status=503;body={error:'unavailable'};}
    else if(route.request().method()==='POST'){const data=route.request().postDataJSON();powerSends.push(data);if(url.pathname.endsWith('/wake'))body={results:data.deviceIds.map(id=>({id,state:'wake-packet-sent',powerOnConfirmed:false}))};else{status=202;const o={id:require('node:crypto').randomUUID(),action:data.action,recipients:data.deviceIds.map(id=>({id,state:'queued'}))};power.operations.unshift(o);body=o;}}
    else body=power;
   }
   else if(url.pathname==='/api/lab-profiles'){
    if(profileUnavailable){status=503;body={error:'unavailable'};}
    else if(route.request().method()==='PUT'){const data=route.request().postDataJSON();if(profileConflict||data.revision!==library.revision){status=409;body={error:'changed'};}else{library={...data,revision:library.revision+1};body=library;}}
    else body=library;
   }
   else if(url.pathname==='/api/lab-settings'){
    if(labUnavailable){status=503;body={error:'unavailable'};}
    else if(route.request().method()==='PUT'){const data=route.request().postDataJSON();if(labConflict||data.revision!==lab.revision){status=409;body={error:'changed'};}else{lab={...data,revision:lab.revision+1};body=lab;}}
    else body=lab;
   }
   else if(url.pathname==='/api/status'){status=statusFail?503:200;body={mode:'live',lab:{name:'معمل الاختبار'},students:devices};}
   else if(url.pathname==='/api/frames'){status=framesFail?503:200;body={frames:devices.map(d=>({id:d.id,jpeg:image,assistanceMonitor:true,at:Date.now()-(frameMode==='stale'?6000:0)}))};}
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
  async function go(target){const selector='nav [data-page="'+target+'"]';if(!await page.locator(selector).isVisible()){if(await page.locator('#view-return').isVisible())await page.click('#view-return');if(['power','monitor','enrollment'].includes(target)){await page.click('#teacher-tools summary');await page.click('#teacher-tools [data-go="'+target+'"]');return;}if(target==='home')return;}await page.click(selector);}

  const crypto=require('node:crypto');devices=Array.from({length:21},(_,i)=>({id:'PC-'+String(i+1).padStart(2,'0'),online:true,approved:true,powerSupported:true,assistanceSupported:true,platform:'win32'}));lab={version:1,revision:1,name:'معمل ويندوز 11',platform:'windows',groups:[{id:crypto.randomUUID(),name:'مجموعة (أ)',deviceIds:devices.slice(0,10).map(x=>x.id)},{id:crypto.randomUUID(),name:'مجموعة (ب)',deviceIds:devices.slice(10).map(x=>x.id)}]};library={version:1,revision:1,profiles:[{id:crypto.randomUUID(),name:'معمل ماك',platform:'macos',groups:[{id:crypto.randomUUID(),name:'المجموعة الأولى',deviceIds:devices.map(x=>x.id)}]}]};
  await page.goto('http://localhost:41999/');await page.waitForFunction(()=>!refreshBusy&&labSnapshot!==null);await page.evaluate(()=>{deviceView='grid';render();});
  const output='/workspace/outputs/M183-UI';fs.mkdirSync(output,{recursive:true});
  assert.equal(await page.locator('#devices .device').count(),21);assert.equal(await page.locator('.sidebar').evaluate(e=>e.getBoundingClientRect().left),0,'reference sidebar on left');assert.equal(await page.locator('#devices').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),5,'five reference columns');await page.screenshot({path:output+'/Teacher-Home.png',fullPage:true});
  await go('screens');await page.waitForFunction(()=>!refreshBusy);assert.equal(await page.locator('.sidebar').isVisible(),false);assert.equal(await page.locator('.quick-actions button').count(),7);assert.equal(await page.locator('#devices img').count(),21);await page.screenshot({path:output+'/Teacher-Screens.png',fullPage:true});
  await page.locator('.quick-actions [data-go="broadcast"]').click();await page.waitForFunction(()=>!refreshBusy);assert.equal(await page.locator('.broadcast-reference-view #broadcast-preview').count(),1);assert.equal(await page.locator('#broadcast-start').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight),true,'start stays visible with 21 recipients');await page.screenshot({path:output+'/Teacher-Broadcast.png',fullPage:true});
  await go('settings');await page.waitForFunction(()=>!profileBusy&&profileSnapshot?.profiles.length===1);assert.equal(await page.locator('.settings-menu').isVisible(),true);assert.equal(await page.locator('#lab-editor-details').getAttribute('open'),null);await page.screenshot({path:output+'/Teacher-Settings.png',fullPage:true});
  await page.locator('.settings-menu [data-settings="general"]').click();assert.equal(await page.locator('[data-settings-panel="general"]').isVisible(),true);await page.locator('.settings-menu [data-settings="security"]').click();assert.equal(await page.locator('[data-settings-panel="security"]').isVisible(),true);await page.locator('.settings-menu [data-settings="labs"]').click();await page.locator('.lab-row-edit').first().click();assert.equal(await page.locator('#lab-title').isVisible(),true,'real settings editor remains reachable');
  await go('home');await page.setViewportSize({width:640,height:400});await page.waitForTimeout(100);await page.screenshot({path:output+'/Teacher-Home-Compact.png',fullPage:true});await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);console.log('M183 visual and navigation acceptance passed: left sidebar, five columns, seven actions, standalone views, settings tabs, real editor and mobile. Screenshots use fixture data.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
