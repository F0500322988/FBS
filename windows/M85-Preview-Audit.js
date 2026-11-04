'use strict';
// Read-only, loopback-only preview metadata audit. Never persists image content.
const fs=require('node:fs');
const {request}=require('./M84-Enrollment-Visibility');
function assess(status, enrollment, frames, {expected=1, now=Date.now()}={}) {
 const issues=[];
 if(!Number.isInteger(expected)||expected<1||expected>40)issues.push('invalid_expected_count');
 if(!status||!Array.isArray(status.students)||!enrollment||!Array.isArray(enrollment.devices)||!frames||!Array.isArray(frames.frames))return {stage:'M85',passed:false,issues:['invalid_api_response']};
 if(status.mode!=='live')issues.push('not_live_mode');
 if(status.features?.remoteControl!==false)issues.push('remote_input_not_disabled');
 const students=new Map(), enrolled=new Map(), seen=new Set();
 for(const s of status.students){if(typeof s.id!=='string'||!s.id||students.has(s.id))issues.push('invalid_or_duplicate_student');else students.set(s.id,s);}
 for(const d of enrollment.devices){if(typeof d.id!=='string'||!d.id||enrolled.has(d.id))issues.push('invalid_or_duplicate_enrollment');else enrolled.set(d.id,d);}
 let valid=0;const observed=[];
 for(const frame of frames.frames){
  const id=frame?.id;
  if(typeof id!=='string'||!id||seen.has(id)){issues.push('invalid_or_duplicate_frame_id');continue;}
  seen.add(id);
  const student=students.get(id), device=enrolled.get(id);
  if(!student||!device||student.online!==true||student.approved!==true||device.approved!==true)issues.push('unapproved_or_offline_preview');
  if(!Number.isFinite(frame.at)||frame.at>now+1000||now-frame.at>5000||now-frame.at< -1000)issues.push('stale_or_future_frame');
  if(typeof frame.jpeg!=='string'||frame.jpeg.length<16||frame.jpeg.length>2_000_000||!/^\/9j\//.test(frame.jpeg)||!/^[A-Za-z0-9+/]*={0,2}$/.test(frame.jpeg))issues.push('invalid_preview_encoding');
  if(student?.online===true&&student.approved===true&&device?.approved===true&&Number.isFinite(frame.at)&&frame.at<=now+1000&&now-frame.at<=5000&&typeof frame.jpeg==='string'&&frame.jpeg.startsWith('/9j/'))valid++;
  observed.push({id,ageMs:Number.isFinite(frame.at)?Math.round(now-frame.at):null});
 }
 if(valid<expected)issues.push('insufficient_approved_fresh_previews');
 if(frames.frames.length>40)issues.push('capacity_exceeded');
 return {stage:'M85',passed:issues.length===0,issues:[...new Set(issues)],expected,validPreviews:valid,receivedFrames:frames.frames.length,observed,note:'Read-only metadata audit; preview image bytes are never written to report. Approval of device enrollment does not substitute for student consent to view.'};
}
async function collect({port=4177,password,expected=1}={}){
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('invalid_port');
 if(!password)throw Error('FBS_TEACHER_PASSWORD required');
 const login=await request({port,path:'/api/login',method:'POST',body:{password}});
 if(!login.cookie?.startsWith('fbs_session='))throw Error('missing_session_cookie');
 try{
  const [s,e,f]=await Promise.all(['/api/status','/api/enrollment/devices','/api/frames'].map(path=>request({port,path,cookie:login.cookie})));
  return assess(s.json,e.json,f.json,{expected});
 }finally{await request({port,path:'/api/logout',method:'POST',cookie:login.cookie}).catch(()=>{});}
}
async function main(args){
 const [expectedRaw='1',reportPath='m85-preview-report.json',portRaw='4177']=args;
 const report=await collect({expected:Number(expectedRaw),port:Number(portRaw),password:process.env.FBS_TEACHER_PASSWORD});
 fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error('M85 audit failed:',e.message);process.exitCode=1;});
module.exports={assess,collect};
