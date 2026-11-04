/* M105: read-only status transitions. No persistence or remote-control actions. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FBSDeviceEvents=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const validId=id=>typeof id==='string'&&id.length>0&&id.length<=128;
 function classify(s){if(!s||!validId(s.id))return 'invalid';if(s.approved!==true)return 'unapproved';return s.online===true?'online':'offline';}
 function snapshot(devices){if(!Array.isArray(devices))throw Error('Invalid roster');const map=new Map();for(const d of devices){if(!d||!validId(d.id)||map.has(d.id))continue;map.set(d.id,classify(d));}return map;}
 function diff(previous,current,at){const changes=[];if(!(previous instanceof Map)||!(current instanceof Map))return changes;for(const [id,state] of current){if(!previous.has(id))continue;const before=previous.get(id);if(before===state)continue;let type='state';if(before==='online'&&state==='offline')type='disconnected';else if(before==='offline'&&state==='online')type='reconnected';else if(state==='unapproved')type='approval-removed';else if(before==='unapproved')type='approval-granted';changes.push({id,from:before,to:state,type,at});}return changes;}
 function append(history,changes,limit=100){const max=Number.isInteger(limit)&&limit>0?Math.min(limit,500):100;return [...history,...changes].slice(-max);}
 return {classify,snapshot,diff,append};
});
