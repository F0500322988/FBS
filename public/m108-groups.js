/* M108: display-only logical groups; no claim about physical seat placement. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FBSDeviceGroups=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function validSize(n){return Number.isInteger(n)&&n>=1&&n<=40;}
 function seatNumber(id){if(typeof id!=='string')return null;const match=id.match(/(\d+)$/);if(!match)return null;const n=Number(match[1]);return Number.isSafeInteger(n)&&n>=1&&n<=9999?n:null;}
 function groupOf(device,size){if(!validSize(size))throw new RangeError('Invalid group size');const n=seatNumber(device&&device.id);return n===null?'unassigned':String(Math.floor((n-1)/size)+1);}
 function group(devices,size){if(!Array.isArray(devices)||!validSize(size))return [];const groups=new Map();for(const device of devices){const key=groupOf(device,size);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(device);}return [...groups].sort((a,b)=>a[0]==='unassigned'?1:b[0]==='unassigned'?-1:Number(a[0])-Number(b[0])).map(([key,items])=>({key,label:key==='unassigned'?'أجهزة دون رقم مقعد':'مجموعة '+key,devices:items,online:items.filter(x=>x&&x.approved===true&&x.online===true).length,attention:items.filter(x=>!x||x.approved!==true||x.online!==true).length}));}
 return {seatNumber,groupOf,group,validSize};
});
