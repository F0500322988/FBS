/* M107: deterministic, read-only device ordering and attention filters. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FBSDevicePriority=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const modes=new Set(['attention','name','online','offline']);
 function state(d){if(!d||typeof d.id!=='string'||!d.id.trim())return 'invalid';if(d.approved!==true)return 'unapproved';return d.online===true?'online':'offline';}
 function attention(d){return state(d)!=='online';}
 function rank(d,mode){const s=state(d);const ranks=mode==='online'?{online:0,offline:1,unapproved:2,invalid:3}:mode==='offline'?{offline:0,unapproved:1,invalid:2,online:3}:{offline:0,unapproved:1,invalid:2,online:3};return ranks[s];}
 function select(devices,options={}){
  if(!Array.isArray(devices))return [];
  const mode=modes.has(options.sort)?options.sort:'attention';const query=typeof options.query==='string'?options.query.trim().toLocaleLowerCase():'';
  const onlyAttention=options.onlyAttention===true;
  return devices.filter(d=>d&&typeof d.id==='string'&&(!query||d.id.toLocaleLowerCase().includes(query))&&(!onlyAttention||attention(d))).map((device,index)=>({device,index})).sort((a,b)=>{
   if(mode!=='name'){const diff=rank(a.device,mode)-rank(b.device,mode);if(diff)return diff;}
   const name=a.device.id.localeCompare(b.device.id,undefined,{numeric:true,sensitivity:'base'});return name||a.index-b.index;
  }).map(x=>x.device);
 }
 return {state,attention,select};
});
