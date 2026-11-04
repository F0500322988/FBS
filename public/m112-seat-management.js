/* M112: local-only seat assignment management; never contacts student devices. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FBSSeatManagement=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function unassigned(devices,config){const seats=config&&config.seats&&typeof config.seats==='object'?config.seats:{};const seen=new Set();return (Array.isArray(devices)?devices:[]).filter(d=>{if(!d||typeof d.id!=='string'||!d.id||seen.has(d.id))return false;seen.add(d.id);return !Object.prototype.hasOwnProperty.call(seats,d.id);});}
 function reset(config){const rows=Number.isInteger(config&&config.rows)?Math.max(1,Math.min(8,config.rows)):3;const columns=Number.isInteger(config&&config.columns)?Math.max(1,Math.min(10,config.columns)):7;return {rows,columns,seats:{}};}
 function remove(config,id){const result=reset(config);if(config&&config.seats&&typeof config.seats==='object'){for(const [key,value] of Object.entries(config.seats)){if(key!==id&&key!=='__proto__'&&key!=='constructor'&&key!=='prototype'&&typeof key==='string'&&key.length<=128&&Number.isInteger(value)&&value>=1&&value<=result.rows*result.columns&&!Object.values(result.seats).includes(value))result.seats[key]=value;}}return result;}
 return {unassigned,reset,remove};
});
