/* M111: local seat-map backup only. No student controls or network requests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FBSSeatTransfer=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const VERSION=1,MAX_BYTES=16384;
 function valid(config){
  if(!config||typeof config!=='object'||Array.isArray(config))throw Error('مخطط غير صالح');
  const {rows,columns,seats}=config;
  if(!Number.isInteger(rows)||rows<1||rows>8||!Number.isInteger(columns)||columns<1||columns>10)throw Error('أبعاد المقاعد غير صالحة');
  if(!seats||typeof seats!=='object'||Array.isArray(seats))throw Error('توزيع المقاعد غير صالح');
  const entries=Object.entries(seats),occupied=new Set(),safe=Object.create(null);
  if(entries.length>40)throw Error('عدد التعيينات يتجاوز 40');
  for(const [id,pos] of entries){
   if(!id||id.length>128||id==='__proto__'||id==='constructor'||id==='prototype'||!Number.isInteger(pos)||pos<1||pos>rows*columns||occupied.has(pos))throw Error('تعيين مقعد غير صالح أو مكرر');
   occupied.add(pos);safe[id]=pos;
  }
  return {rows,columns,seats:Object.fromEntries(Object.entries(safe))};
 }
 function serialize(config){return JSON.stringify({format:'fbs-classroom-seat-map',version:VERSION,layout:valid(config)},null,2)+'\n';}
 function parse(input){
  if(typeof input!=='string'||new TextEncoder().encode(input).length>MAX_BYTES)throw Error('الملف كبير جدًا أو غير صالح');
  let data;try{data=JSON.parse(input);}catch(_){throw Error('الملف ليس JSON صالحًا');}
  if(!data||data.format!=='fbs-classroom-seat-map'||data.version!==VERSION)throw Error('نوع الملف أو إصداره غير مدعوم');
  return valid(data.layout);
 }
 return {serialize,parse,MAX_BYTES};
});
