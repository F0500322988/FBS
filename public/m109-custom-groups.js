/* M109: per-browser presentation preferences only. No student-side changes. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FBSCustomGroups=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const LIMIT=8;
 function cleanName(s){return typeof s==='string'?s.trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,40):'';}
 function normalize(raw){const names=Array.isArray(raw&&raw.names)?raw.names.slice(0,LIMIT).map(cleanName).filter(Boolean):[];const unique=[...new Set(names)];const assignments={};if(raw&&raw.assignments&&typeof raw.assignments==='object'&&!Array.isArray(raw.assignments)){for(const [id,name] of Object.entries(raw.assignments).slice(0,40)){if(typeof id==='string'&&id.length<=128&&unique.includes(name))assignments[id]=name;}}return {names:unique,assignments};}
 function assign(config,id,name){const result=normalize(config);if(typeof id!=='string'||!id||id.length>128)return result;if(name&&result.names.includes(name))result.assignments[id]=name;else delete result.assignments[id];return result;}
 function group(devices,config){const cfg=normalize(config);const buckets=new Map(cfg.names.map(n=>[n,[]]));buckets.set('غير موزعة',[]);for(const d of Array.isArray(devices)?devices:[]){const name=d&&cfg.assignments[d.id];(buckets.get(name)||buckets.get('غير موزعة')).push(d);}return [...buckets].filter(([,items])=>items.length).map(([label,items])=>({label,devices:items,online:items.filter(x=>x&&x.approved===true&&x.online===true).length,attention:items.filter(x=>!x||x.approved!==true||x.online!==true).length}));}
 return {cleanName,normalize,assign,group};
});
