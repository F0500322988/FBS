/* M110: local-only seat layout. Never controls student devices. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FBSSeatMap=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function normalize(raw){const rows=Number.isInteger(raw&&raw.rows)?Math.max(1,Math.min(8,raw.rows)):3;const columns=Number.isInteger(raw&&raw.columns)?Math.max(1,Math.min(10,raw.columns)):7;const seats={};if(raw&&raw.seats&&typeof raw.seats==='object'&&!Array.isArray(raw.seats)){for(const [id,pos] of Object.entries(raw.seats).slice(0,40)){if(typeof id==='string'&&id.length<=128&&Number.isInteger(pos)&&pos>=1&&pos<=rows*columns&&!Object.values(seats).includes(pos))seats[id]=pos;}}return {rows,columns,seats};}
 function place(config,id,position){const result=normalize(config);if(typeof id!=='string'||!id||id.length>128)return result;delete result.seats[id];if(Number.isInteger(position)&&position>=1&&position<=result.rows*result.columns){for(const [key,value] of Object.entries(result.seats)){if(value===position)delete result.seats[key];}result.seats[id]=position;}return result;}
 function layout(devices,config){const cfg=normalize(config),list=Array.isArray(devices)?devices.filter(d=>d&&typeof d.id==='string'):[];const seen=new Set(),slots=Array(cfg.rows*cfg.columns).fill(null),overflow=[];
  for(const d of list){if(seen.has(d.id))continue;seen.add(d.id);const pos=cfg.seats[d.id];if(pos&&slots[pos-1]===null)slots[pos-1]=d;else overflow.push(d);}
  for(const d of overflow){const i=slots.indexOf(null);if(i<0)break;slots[i]=d;}
  return {rows:cfg.rows,columns:cfg.columns,slots,unplaced:overflow.filter(d=>!slots.includes(d)),capacity:slots.length};
 }
 return {normalize,place,layout};
});
