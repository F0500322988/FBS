/* M106: read-only status warning and event filters. No persistence or control. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FBSMonitorAlerts=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const allowed=new Set(['all','disconnected','reconnected','approval-granted','approval-removed','state']);
 function filterEvents(events,type='all'){
  if(!Array.isArray(events))return [];
  if(!allowed.has(type))return [];
  return events.filter(e=>e&&typeof e.type==='string'&&(type==='all'||e.type===type));
 }
 function offlineSummary(devices,fresh){
  if(!fresh||!Array.isArray(devices))return {kind:'stale',count:0,message:'بيانات الاتصال غير حديثة؛ لا يمكن تأكيد الأجهزة المنقطعة.'};
  const offline=devices.filter(d=>d&&typeof d.id==='string'&&d.id.length>0&&d.approved===true&&d.online!==true).length;
  if(offline===0)return {kind:'none',count:0,message:''};
  return {kind:'warning',count:offline,message:`تنبيه: يوجد ${offline} جهاز معتمد غير متصل حاليًا. تحقق من الاتصال قبل بدء الدرس.`};
 }
 return {filterEvents,offlineSummary};
});
