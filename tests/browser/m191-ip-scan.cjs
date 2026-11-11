'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.FBS_BROWSER_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];let approved=false,invalid=false;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://localhost:41999/**',async route=>{
   const pathname=new URL(route.request().url()).pathname;
   if(pathname==='/api/auth')return route.fulfill({json:{required:false,authenticated:true}});
   if(pathname==='/api/status')return route.fulfill({json:{students:[],mode:'live',lab:{name:'معمل الاختبار'}}});
   if(pathname==='/api/enrollment/scan'){
    assert.deepEqual(route.request().postDataJSON(),{first:'192.168.1.10',last:'192.168.1.20'});
    return route.fulfill({status:invalid?400:200,json:invalid?{error:'نطاق غير صحيح'}:{scanned:11,found:[{id:'PC-01',ip:'192.168.1.10',platform:'win32',approved:true},{id:'MAC-02',ip:'192.168.1.20',platform:'darwin',approved:false}]}});
   }
   if(pathname==='/api/enrollment/approve'){assert.equal(route.request().postDataJSON().deviceId,'MAC-02');approved=true;return route.fulfill({json:{ok:true}});}
   if(pathname.startsWith('/api/'))return route.fulfill({status:404,json:{error:'fixture unavailable'}});
   const file=path.join(__dirname,'../../public',pathname==='/'?'index.html':pathname.slice(1));
   return route.fulfill({body:fs.readFileSync(file),contentType:pathname.endsWith('.js')?'text/javascript':pathname.endsWith('.css')?'text/css':'text/html'});
  });
  await page.goto('http://localhost:41999/');await page.locator('#ip-scan-open').click();
  assert.equal(await page.locator('.ip-scan-dialog').isVisible(),true);
  await page.locator('#ip-scan-first').fill('192.168.1.10');await page.locator('#ip-scan-last').fill('192.168.1.20');await page.getByRole('button',{name:'Scan',exact:true}).click();
  await page.locator('#ip-scan-status').filter({hasText:'عُثر على 2'}).waitFor();
  assert.equal(await page.locator('#ip-scan-results article').count(),2);
  assert.equal(await page.locator('#ip-scan-results button').first().isDisabled(),true);
  await page.getByRole('button',{name:'اعتماد الجهاز',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('#ip-scan-results button')].every(b=>b.disabled));assert.ok(approved);
  await page.screenshot({path:process.env.FBS_SCAN_SCREENSHOT||'/tmp/m191-ip-scan.png'});
  invalid=true;await page.getByRole('button',{name:'Scan',exact:true}).click();await page.locator('#ip-scan-status').filter({hasText:'نطاق غير صحيح'}).waitFor();
  assert.equal(await page.locator('#ip-scan-results article').count(),0);
  await page.locator('#ip-scan-close').click();assert.equal(await page.locator('.ip-scan-dialog').isVisible(),false);assert.deepEqual(errors,[]);
  console.log('IP scan browser checks passed: range entry, results, manual approval, error clearing, close, no page errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
