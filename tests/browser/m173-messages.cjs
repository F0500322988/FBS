'use strict';
// Optional browser acceptance: node tests/browser/m173-messages.cjs (Playwright + Chromium).
const {chromium}=require('playwright');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const publicRoot=path.resolve(__dirname,'../../public');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.FBS_BROWSER_EXECUTABLE?{executablePath:process.env.FBS_BROWSER_EXECUTABLE}:{}),args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  let statusFail=false,framesFail=false,devices=[],frameMode='fresh',messages=[],messageFail=false,sends=[];
  const image='data:image/jpeg;base64,/9j/2Q==';
  await page.route('http://fbs.test/**',async route=>{
   const url=new URL(route.request().url());let body,type='application/json',status=200;
   if(url.pathname==='/api/auth')body={required:false};
   else if(url.pathname==='/api/assist')body={status:'idle'};
   else if(url.pathname==='/api/lab-profiles')body={version:1,revision:0,profiles:[]};
   else if(url.pathname==='/api/lab-settings')body={version:1,revision:0,name:'معمل الاختبار',platform:'windows',groups:[]};
   else if(url.pathname==='/api/status'){status=statusFail?503:200;body={mode:'live',lab:{name:'معمل الاختبار'},students:devices};}
   else if(url.pathname==='/api/frames'){status=framesFail?503:200;body={frames:devices.map(d=>({id:d.id,jpeg:image,at:Date.now()-(frameMode==='stale'?6000:0)}))};}
   else if(url.pathname==='/api/messages'){
    if(route.request().method()==='POST'){
     const data=route.request().postDataJSON();sends.push(data);status=messageFail?409:202;
     if(!messageFail)messages.unshift({id:'browser-test',text:data.text,recipients:data.deviceIds.map(id=>({id,state:'queued'}))});body={id:'browser-test'};
    }else body={messages};
   }
   else if(url.pathname==='/api/enrollment/devices')body={devices:[]};
   else {const file=url.pathname==='/'?'index.html':url.pathname.slice(1);if(!/^[\w.-]+$/.test(file))throw Error('Unexpected route');body=fs.readFileSync(path.join(publicRoot,file));type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html';}
   await route.fulfill({status,contentType:type,body:Buffer.isBuffer(body)?body:JSON.stringify(body)});
  });
  // HTML must be sent as raw bytes by the static mock.
  await page.goto('http://fbs.test/');
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
  messages[0].text='يرجى فتح ملف النشاط والبدء في التمرين الأول';await page.evaluate(()=>loadMessageHistory());await page.fill('#message-text','');await page.evaluate(()=>{el('message-result').textContent='';window.scrollTo(0,0);});
  if(process.env.FBS_SCREENSHOT)await page.screenshot({path:process.env.FBS_SCREENSHOT,fullPage:true});
  assert.deepEqual(errors,[]);console.log('M173 browser acceptance passed: message recipients, text-only rendering, queued/read states, send failure, revoke and mobile layout; regression: empty/search/list, live roster, consent/online/fresh previews, HTTP failure cleanup, unavailable features, recovery, mobile layout, no JS errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
