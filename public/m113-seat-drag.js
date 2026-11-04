/* M113: teacher-browser-only seat drag and drop; no network or student control. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FBSSeatDrag=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function move(config,id,target,knownIds){
  const base=typeof FBSSeatMap!=='undefined'?FBSSeatMap:require('./m110-seat-map');
  const current=base.normalize(config);
  if(typeof id!=='string'||!id||id.length>128||!Array.isArray(knownIds)||!knownIds.includes(id)||!Number.isInteger(target)||target<1||target>current.rows*current.columns)return {changed:false,config:current};
  const previous=current.seats[id]||null;
  if(previous===target)return {changed:false,config:current};
  const occupant=Object.keys(current.seats).find(key=>current.seats[key]===target);
  const next={...current,seats:{...current.seats}};
  delete next.seats[id];
  if(occupant){delete next.seats[occupant];if(previous!==null)next.seats[occupant]=previous;}
  next.seats[id]=target;
  return {changed:true,config:base.normalize(next),displaced:occupant||null};
 }
 return {move};
});
