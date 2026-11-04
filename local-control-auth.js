'use strict';
const crypto=require('node:crypto');
// The token is created by the interactive C# app and inherited by its child process.
// No HTTP endpoint can retrieve it; all control decisions require the header.
function authorizedLocalRequest(req,expected){
 if(typeof expected!=='string'||!(/^[a-f0-9]{64}$/i).test(expected))return false;
 if(req.headers.origin)return false; // browsers cannot submit cross-origin requests
 const supplied=req.headers['x-fbs-local-token'];
 if(typeof supplied!=='string'||!/^[a-f0-9]{64}$/i.test(supplied))return false;
 return crypto.timingSafeEqual(Buffer.from(supplied,'hex'),Buffer.from(expected,'hex'));
}
module.exports={authorizedLocalRequest};
