'use strict';
// Read-only performance audit: only aggregate statistics leave this process.
const fs = require('node:fs');
const {collect} = require('./M91-Concurrent-Preview-Load');
const {request} = require('./M84-Enrollment-Visibility');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function percentile(values, pct) {
 if (!values.length) return null;
 const sorted = [...values].sort((a,b)=>a-b);
 return sorted[Math.ceil((pct/100)*sorted.length)-1];
}
function evaluate(samples,{expected=5,maxAgeMs=5000,maxP95LatencyMs=1500,minUpdateRatio=0.8}={}) {
 const issues=[];
 if (!Number.isInteger(expected)||expected<2||expected>40) issues.push('invalid_expected');
 if (!Array.isArray(samples)||samples.length<3||samples.length>60) issues.push('invalid_samples');
 if (!Number.isInteger(maxAgeMs)||maxAgeMs<1000||maxAgeMs>30000) issues.push('invalid_max_age');
 if (!Number.isInteger(maxP95LatencyMs)||maxP95LatencyMs<50||maxP95LatencyMs>30000) issues.push('invalid_latency_threshold');
 if (typeof minUpdateRatio!=='number'||!Number.isFinite(minUpdateRatio)||minUpdateRatio<0||minUpdateRatio>1) issues.push('invalid_update_ratio');
 if(issues.length) return {stage:'M92',passed:false,issues,remoteInputEnabled:false};
 const latencies=[],ages=[],perDevice=new Map(), summaries=[];
 let priorTime=null, baseline=null;
 for (const [index,sample] of samples.entries()) {
  const {now,latencyMs,status,enrollment,frames}=sample||{};
  if(!Number.isFinite(now)||!Number.isFinite(latencyMs)||latencyMs<0||!status||status.mode!=='live'||status.features?.remoteControl!==false||!Array.isArray(status.students)||!Array.isArray(enrollment?.devices)||!Array.isArray(frames?.frames)) {issues.push(`invalid_or_unsafe_sample_${index+1}`);continue;}
  if(priorTime!==null&&now<=priorTime) issues.push(`non_monotonic_sample_${index+1}`);
  priorTime=now;latencies.push(latencyMs);
  const students=new Map(),approved=new Set(),current=new Map();
  for(const s of status.students){if(typeof s?.id!=='string'||!s.id||students.has(s.id))issues.push(`duplicate_student_${index+1}`);else students.set(s.id,s);}
  for(const d of enrollment.devices){if(typeof d?.id!=='string'||!d.id||approved.has(d.id))issues.push(`duplicate_enrollment_${index+1}`);else if(d.approved===true)approved.add(d.id);}
  for(const f of frames.frames){
   if(typeof f?.id!=='string'||!f.id||current.has(f.id)){issues.push(`duplicate_frame_${index+1}`);continue;}
   current.set(f.id,f.at);
   const student=students.get(f.id);
   if(!student||student.online!==true||student.approved!==true||!approved.has(f.id))issues.push(`unapproved_preview_${index+1}`);
   if(!Number.isFinite(f.at)||f.at>now+1000||now-f.at>maxAgeMs)issues.push(`stale_preview_${index+1}`);
   else ages.push(Math.max(0,now-f.at));
  }
  if(current.size<expected)issues.push(`insufficient_previews_${index+1}`);
  if(current.size>40)issues.push(`capacity_exceeded_${index+1}`);
  if(index===0)baseline=new Set(current.keys());
  if(baseline){for(const id of baseline){const state=perDevice.get(id)||{updates:0,observed:0,last:null};const at=current.get(id);state.observed++;if(index>0&&Number.isFinite(at)&&Number.isFinite(state.last)&&at>state.last)state.updates++;if(Number.isFinite(at))state.last=at;perDevice.set(id,state);if(!current.has(id))issues.push(`missing_baseline_device_${index+1}`);}}
  summaries.push({sample:index+1,previewCount:current.size,latencyMs});
 }
 const intervals=Math.max(0,samples.length-1);
 const qualifying=[...perDevice.values()].filter(d=>intervals>0&&d.updates===intervals).length;
 const required=Math.ceil(expected*minUpdateRatio);
 if(perDevice.size<expected)issues.push('insufficient_baseline_devices');
 if(qualifying<required)issues.push('insufficient_continuous_updates');
 const p95=percentile(latencies,95);
 if(p95!==null&&p95>maxP95LatencyMs)issues.push('high_p95_latency');
 return {stage:'M92',passed:issues.length===0,issues:[...new Set(issues)],expected,sampleCount:samples.length,continuousUpdatingDevices:qualifying,requiredContinuousUpdatingDevices:required,p50LatencyMs:percentile(latencies,50),p95LatencyMs:p95,maxLatencyMs:latencies.length?Math.max(...latencies):null,p95PreviewAgeMs:percentile(ages,95),samples:summaries,remoteInputEnabled:false,limitations:'Server metadata only. Update cadence is sampled, not video FPS; no bandwidth or image-quality measurement. Consent/Stop must be verified on student devices.'};
}
async function measure({port=4177,password,expected=5,count=6,intervalMs=2000,maxAgeMs=5000,maxP95LatencyMs=1500,minUpdateRatio=0.8}={}) {
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('invalid_port');
 if(typeof password!=='string'||!password)throw Error('FBS_TEACHER_PASSWORD required');
 if(!Number.isInteger(expected)||expected<2||expected>40)throw Error('expected must be 2 to 40');
 if(!Number.isInteger(count)||count<3||count>60)throw Error('count must be 3 to 60');
 if(!Number.isInteger(intervalMs)||intervalMs<500||intervalMs>30000)throw Error('interval must be 500 to 30000 ms');
 if(!Number.isInteger(maxAgeMs)||maxAgeMs<1000||maxAgeMs>30000)throw Error('invalid_max_age');
 if(!Number.isInteger(maxP95LatencyMs)||maxP95LatencyMs<50||maxP95LatencyMs>30000)throw Error('invalid_latency_threshold');
 const login=await request({port,path:'/api/login',method:'POST',body:{password}});
 if(!login.cookie?.startsWith('fbs_session='))throw Error('missing session cookie');
 const samples=[];
 try{
  for(let i=0;i<count;i++){
   if(i)await sleep(intervalMs);
   const start=Date.now();
   const [s,e,f]=await Promise.all(['/api/status','/api/enrollment/devices','/api/frames'].map(path=>request({port,path,cookie:login.cookie})));
   const now=Date.now();samples.push({status:s.json,enrollment:e.json,frames:f.json,now,latencyMs:now-start});
  }
  return evaluate(samples,{expected,maxAgeMs,maxP95LatencyMs,minUpdateRatio});
 }finally{await request({port,path:'/api/logout',method:'POST',cookie:login.cookie}).catch(()=>{});}
}
async function main(args){
 const [expectedRaw='5',reportPath='m92-performance-report.json',countRaw='6',intervalRaw='2000',portRaw='4177',latencyRaw='1500']=args;
 const report=await measure({expected:Number(expectedRaw),count:Number(countRaw),intervalMs:Number(intervalRaw),port:Number(portRaw),maxP95LatencyMs:Number(latencyRaw),password:process.env.FBS_TEACHER_PASSWORD});
 fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error('M92 audit failed:',e.message);process.exitCode=1;});
module.exports={percentile,evaluate,measure};
