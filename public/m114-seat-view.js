/* M114: local presentation-only zoom and focus; no student commands. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FBSSeatView=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const levels=[75,90,100,110,125,150];
 function zoom(value){const n=Number(value);return levels.includes(n)?n:100;}
 function next(value,direction){const i=levels.indexOf(zoom(value));return levels[Math.max(0,Math.min(levels.length-1,i+(direction>0?1:-1)))];}
 function focus(devices,id){if(typeof id!=='string'||!id)return null;return (Array.isArray(devices)?devices:[]).find(d=>d&&d.id===id)||null;}
 function summary(device){if(!device)return 'لم يتم تحديد جهاز';return 'الجهاز المحدد: '+device.id+' — '+(device.approved!==true?'بانتظار الاعتماد':device.online===true?'متصل ومعتمد':'غير متصل');}
 return {levels,zoom,next,focus,summary};
});
