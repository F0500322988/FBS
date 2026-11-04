'use strict';
const net=require('node:net');
function configuredTeacher(env=process.env){
 const names=['FBS_TEACHER_HOST','FBS_TEACHER_PORT','FBS_TEACHER_FINGERPRINT'];
 const values=names.map(name=>env[name]);
 if(values.every(value=>value===undefined||value===''))return null;
 const [host,portText,fingerprint]=values;
 if(typeof host!=='string'||host.length>253||host.trim()!==host||
    !(net.isIPv4(host)||/^(?=.{1,253}$)[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(host))||
    host.split('.').some(label=>!label||label.length>63||label.startsWith('-')||label.endsWith('-')))
  throw Error('Invalid configured teacher host');
 if(typeof portText!=='string'||!/^\d{1,5}$/.test(portText)||Number(portText)<1||Number(portText)>65535)
  throw Error('Invalid configured teacher port');
 if(typeof fingerprint!=='string'||!/^[a-fA-F0-9]{64}$/.test(fingerprint))
  throw Error('A trusted SHA-256 teacher certificate fingerprint is required');
 return {host,port:Number(portText),fingerprint:fingerprint.toLowerCase()};
}
module.exports={configuredTeacher};
