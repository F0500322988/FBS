'use strict';
const {randomUUID}=require('node:crypto');
const validSession=id=>typeof id==='string'&&/^[a-f0-9]{8}-[a-f0-9-]{27}$/.test(id);
function jpegDimensions(jpeg){
 if(typeof jpeg!=='string'||jpeg.length>170000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(jpeg))throw Error('Invalid JPEG');
 const b64=jpeg.slice(23),b=Buffer.from(b64,'base64');
 if(b.toString('base64')!==b64||b.length<10||b.readUInt16BE(0)!==0xffd8||b.readUInt16BE(b.length-2)!==0xffd9)throw Error('Invalid JPEG');
 let i=2;
 while(i+3<b.length){
  if(b[i++]!==0xff)throw Error('Invalid JPEG marker');while(b[i]===0xff)i++;
  const marker=b[i++];if(marker===0xda||marker===0xd9)break;
  if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
  if(i+2>b.length)break;const length=b.readUInt16BE(i);if(length<2||i+length>b.length)break;
  if([0xc0,0xc1,0xc2].includes(marker)){
   if(length<8)throw Error('Invalid JPEG dimensions');
   const height=b.readUInt16BE(i+3),width=b.readUInt16BE(i+5);
   if(!width||!height||width>1280||height>720)throw Error('JPEG dimensions exceed 1280x720');return {width,height};
  }
  i+=length;
 }
 throw Error('Missing JPEG dimensions');
}
function createBroadcastStore({now=Date.now}={}){
 let session=null,lastStopped=null;
 function active(){if(session&&session.expiresAt<=now()){lastStopped=session.id;session=null;}return session;}
 function start(targets){
  if(active())throw Error('Broadcast already active');
  if(!Array.isArray(targets)||!targets.length||targets.length>40||new Set(targets.map(t=>t.id)).size!==targets.length||targets.some(t=>typeof t.id!=='string'||!/^[\w.-]{1,64}$/.test(t.id)||typeof t.publicKey!=='string'||!t.publicKey))throw Error('Invalid recipients');
  session={id:randomUUID(),expiresAt:now()+900000,recipients:targets.map(t=>({id:t.id,key:t.publicKey})),frame:null,sequence:0};return state();
 }
 function publish({sessionId,sequence,jpeg}){
  const s=active();if(!s||s.id!==sessionId)throw Error('Broadcast unavailable');
  if(!Number.isSafeInteger(sequence)||sequence<=s.sequence)throw Error('Outdated frame');
  const dimensions=jpegDimensions(jpeg);s.sequence=sequence;s.frame={jpeg,sequence,at:now(),...dimensions};return {accepted:true};
 }
 function state(){const s=active();return s?{active:true,id:s.id,expiresAt:s.expiresAt,deviceIds:s.recipients.map(r=>r.id),frameFresh:!!s.frame&&now()-s.frame.at<3500,sequence:s.sequence}:{active:false};}
 function stop(id){const s=active();if(!s)return id===lastStopped;if(s.id!==id)return false;lastStopped=s.id;session=null;return true;}
 function revoke(id){const s=active();if(!s)return;s.recipients=s.recipients.filter(r=>r.id!==id);if(!s.recipients.length)stop(s.id);}
 function poll(id,key){const s=active();if(!s||!s.frame||now()-s.frame.at>=3500||!s.recipients.some(r=>r.id===id&&r.key===key))return null;return {sessionId:s.id,expiresAt:s.expiresAt,...s.frame};}
 return {start,publish,state,stop,revoke,poll};
}
function createBroadcastReceiver({now=Date.now}={}){
 let latest=null,receivedAt=0,lastSession=null,lastSequence=0;
 return {
  accept(frame){
   if(frame===null){latest=null;return;}
   if(!frame||!validSession(frame.sessionId)||!Number.isSafeInteger(frame.sequence)||frame.sequence<1||!Number.isFinite(frame.expiresAt)||frame.expiresAt<=now()||frame.expiresAt>now()+905000)throw Error('Invalid broadcast frame');
   jpegDimensions(frame.jpeg);
   if(lastSession===frame.sessionId&&frame.sequence<=lastSequence)return;
   lastSession=frame.sessionId;lastSequence=frame.sequence;
   latest={sessionId:frame.sessionId,sequence:frame.sequence,jpeg:frame.jpeg,expiresAt:frame.expiresAt};receivedAt=now();
  },
  snapshot(){if(!latest||now()-receivedAt>=3500||latest.expiresAt<=now()){latest=null;return null;}return {...latest};},
  clear(){latest=null;}
 };
}
module.exports={createBroadcastStore,createBroadcastReceiver,jpegDimensions};
