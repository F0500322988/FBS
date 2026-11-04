'use strict';
const os=require('node:os'),crypto=require('node:crypto');
function localIPv4(){return Object.values(os.networkInterfaces()).flat().filter(x=>x&&x.family==='IPv4'&&!x.internal).map(x=>x.address).filter(x=>!x.startsWith('169.254.'));}
function signature(secret,payload){return crypto.createHmac('sha256',secret).update(payload).digest('hex');}
function safeEqual(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;return crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));}
module.exports={localIPv4,signature,safeEqual};
