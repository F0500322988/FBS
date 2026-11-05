'use strict';
// Read-only concurrent preview health audit. Reports contain counts only, never JPEGs or IDs.
const fs=require('node:fs');
const {request}=require('./M84-Enrollment-Visibility');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function evaluate(samples,{expected=5,maxAgeMs=5000,minProgressRatio=0.8}={}){
 const issues=[];
 if(!Number.isInteger(expected)||expected<2||expected>40)issues.push('invalid_expected');
 if(!Array.isArray(samples)||samples.length<3||samples.length>30)issues.push('invalid_sample_count');
 if(!Number.isInteger(maxAgeMs)||maxAgeMs<1000||maxAgeMs>30000)issues.push('invalid_max_age');
 if(typeof minProgressRatio!=='number'||!Number.isFinite(minProgressRatio)||minProgressRatio<0||minProgressRatio>1)issues.push('invalid_progress_ratio');
 if(issues.length)return {stage:'M91',passed:false,issues,remoteInputEnabled:false};
 let previous=new Map(), progressing=new Set(), minimumFresh=Infinity, maximumLatency=0;
 const summaries=[];
 for(const [index,sample] of samples.entries()){
  const {status,enrollment,frames,now,latencyMs}=sample||{};
  if(!Number.isFinite(now)||!Number.isFinite(latencyMs)||latencyMs<0||!status||status.mode!=='live'||status.features?.remoteControl!==false||!Array.isArray(status.students)||!Array.isArray(enrollment?.devices)||!Array.isArray(frames?.frames)){
   issues.push(`invalid_or_unsafe_sample_${index+1}`);continue;
  }
  maximumLatency=Math.max(maximumLatency,latencyMs);
  const students=new Map(), approved=new Set(), current=new Map();let fresh=0;
  for(const s of status.students){if(typeof s?.id!=='string'||!s.id||students.has(s.id)){issues.push(`duplicate_student_${index+1}`);continue;}students.set(s.id,s);}
  for(const d of enrollment.devices){if(typeof d?.id!=='string'||!d.id||approved.has(d.id)){issues.push(`duplicate_enrollment_${index+1}`);continue;}if(d.approved===true)approved.add(d.id);}
  for(const f of frames.frames){
   if(typeof f?.id!=='string'||!f.id||current.has(f.id)){issues.push(`duplicate_frame_${index+1}`);continue;}
   current.set(f.id,f.at);
   const student=students.get(f.id);
   if(!student||student.online!==true||student.approved!==true||!approved.has(f.id))issues.push(`unapproved_preview_${index+1}`);
   if(!Number.isFinite(f.at)||f.at>now+1000||now-f.at>maxAgeMs)issues.push(`stale_preview_${index+1}`);
   else if(student?.online===true&&student.approved===true&&approved.has(f.id))fresh++;
   if(index>0&&previous.has(f.id)&&Number.isFinite(f.at)&&f.at>previous.get(f.id))progressing.add(f.id);
  }
  minimumFresh=Math.min(minimumFresh,fresh);
  if(fresh<expected)issues.push(`insufficient_previews_${index+1}`);
  if(frames.frames.length>40)issues.push(`capacity_exceeded_${index+1}`);
  summaries.push({sample:index+1,fresh,received:frames.frames.length,latencyMs});
  previous=current;
 }
 const requiredProgress=Math.ceil(expected*minProgressRatio);
 if(progressing.size<requiredProgress)issues.push('insufficient_independent_frame_progress');
 return {stage:'M91',passed:issues.length===0,issues:[...new Set(issues)],expected,sampleCount:samples.length,minimumFresh:Number.isFinite(minimumFresh)?minimumFresh:0,progressingCount:progressing.size,requiredProgress,maximumLatencyMs:maximumLatency,samples:summaries,remoteInputEnabled:false,limitations:'Read-only server metadata, not FPS or image quality. Student consent and Stop must be verified on each device. No images or identifiers saved.'};
}
async function collect({port=4177,password,expected=5,count=5,intervalMs=2000,maxAgeMs=5000}={}){
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('invalid_port');
 if(typeof password!=='string'||!password)throw Error('FBS_TEACHER_PASSWORD required');
 if(!Number.isInteger(expected)||expected<2||expected>40)throw Error('expected must be 2 to 40');
 if(!Number.isInteger(count)||count<3||count>30)throw Error('count must be 3 to 30');
 if(!Number.isInteger(intervalMs)||intervalMs<500||intervalMs>30000)throw Error('interval must be 500 to 30000 ms');
 if(!Number.isInteger(maxAgeMs)||maxAgeMs<1000||maxAgeMs>30000)throw Error('invalid max age');
 const login=await request({port,path:'/api/login',method:'POST',body:{password}});
 if(!login.cookie?.startsWith('fbs_session='))throw Error('missing session cookie');
 const samples=[];
 try{
  for(let i=0;i<count;i++){
   if(i)await sleep(intervalMs);
   const start=Date.now();
   const [s,e,f]=await Promise.all(['/api/status','/api/enrollment/devices','/api/frames'].map(path=>request({port,path,cookie:login.cookie})));
   samples.push({status:s.json,enrollment:e.json,frames:f.json,now:Date.now(),latencyMs:Date.now()-start});
  }
  return evaluate(samples,{expected,maxAgeMs});
 }finally{await request({port,path:'/api/logout',method:'POST',cookie:login.cookie}).catch(()=>{});}
}
async function main(args){
 const [expectedRaw='5',reportPath='m91-concurrent-report.json',countRaw='5',intervalRaw='2000',portRaw='4177']=args;
 const report=await collect({expected:Number(expectedRaw),count:Number(countRaw),intervalMs:Number(intervalRaw),port:Number(portRaw),password:process.env.FBS_TEACHER_PASSWORD});
 fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error('M91 audit failed:',e.message);process.exitCode=1;});
module.exports={evaluate,collect};
