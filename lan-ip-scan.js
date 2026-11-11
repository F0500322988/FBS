'use strict';
function ipv4(value){
 if(typeof value!=='string'||! /^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(value))throw Error('أدخل عنوان IPv4 صحيحًا');
 const bytes=value.split('.').map(Number);if(bytes.some(x=>x>255))throw Error('أدخل عنوان IPv4 صحيحًا');
 const [a,b]=bytes;if(!(a===10||a===172&&b>=16&&b<=31||a===192&&b===168))throw Error('استخدم عناوين الشبكة المحلية الخاصة فقط');
 return bytes.reduce((n,x)=>n*256+x,0);
}
function range(first,last){const start=ipv4(first),end=ipv4(last);if(end<start)throw Error('آخر IP يجب ألا يسبق أول IP');if(end-start>=1024)throw Error('الحد الأقصى 1024 عنوانًا في كل مسح');
 // Do not cross private network blocks through public address space.
 if(Math.floor(start/16777216)!==Math.floor(end/16777216)||Math.floor(start/16777216)===172&&Math.floor(start/1048576)!==Math.floor(end/1048576))throw Error('اختر نطاقًا داخل الشبكة الخاصة نفسها');
 return {start,end,count:end-start+1};}
function address(n){return [24,16,8,0].map(shift=>Math.floor(n/2**shift)%256).join('.');}
function createIpScanner({devices,announce,waitMs=6500}){
 let busy=false;
 return {async scan(first,last){
  const target=range(first,last);if(busy){const e=Error('يوجد مسح جارٍ؛ انتظر اكتماله');e.status=409;throw e;}
  busy=true;const started=Date.now();
  try{
   for(let n=target.start;n<=target.end;n++){
    if(Date.now()-started>12000)throw Error('انتهت مهلة إرسال المسح؛ استخدم نطاقًا أصغر');
    await announce(address(n));
    if((n-target.start+1)%32===0)await new Promise(r=>setTimeout(r,25));
   }
   await new Promise(r=>setTimeout(r,waitMs));
   const found=[...devices.values()].filter(d=>{try{const ip=ipv4(d.ip);return ip>=target.start&&ip<=target.end&&d.lastSeen>=started&&Date.now()-d.lastSeen<20000;}catch{return false;}});
   return {first,last,scanned:target.count,found};
  }finally{busy=false;}
 }};
}
module.exports={ipv4,range,address,createIpScanner};
