'use strict';
// Read-only loopback polling. No screenshots, student IDs or credentials in report.
const fs=require('node:fs');
const {request}=require('./M84-Enrollment-Visibility');
const {assess}=require('./M85-Preview-Audit');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function evaluate(samples,{expected=1,minAdvance=1}={}){
 const issues=[];
 if(!Number.isInteger(expected)||expected<1||expected>40)issues.push('invalid_expected');
 if(!Array.isArray(samples)||samples.length<2)issues.push('insufficient_samples');
 if(!Number.isInteger(minAdvance)||minAdvance<1)issues.push('invalid_min_advance');
 let advances=0, previous=new Map();const summaries=[];
 for(const [index,sample] of (Array.isArray(samples)?samples:[]).entries()){
  const result=assess(sample.status,sample.enrollment,sample.frames,{expected,now:sample.now});
  if(!result.passed)issues.push(`sample_${index}_invalid`);
  const current=new Map();
  for(const f of sample.frames?.frames||[]){
   if(typeof f?.id!=='string'||!Number.isFinite(f.at))continue;
   current.set(f.id,f.at);
   if(index>0&&previous.has(f.id)&&f.at>previous.get(f.id))advances++;
  }
  summaries.push({sample:index+1,passed:result.passed,validPreviews:result.validPreviews||0,receivedFrames:result.receivedFrames||0,issues:result.issues});
  previous=current;
 }
 if(advances<minAdvance)issues.push('no_sufficient_frame_progress');
 return {stage:'M86',passed:issues.length===0,expected,sampleCount:summaries.length,frameAdvances:advances,issues,samples:summaries,limitations:'This checks metadata freshness and progression only; consent and student stop must be observed on actual student devices. No screenshot data or identifiers saved.'};
}
async function collect({port=4177,password,expected=1,count=4,intervalMs=2000}={}){
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('invalid_port');
 if(!password)throw Error('FBS_TEACHER_PASSWORD required');
 if(!Number.isInteger(count)||count<2||count>20)throw Error('sample_count_must_be_2_to_20');
 if(!Number.isInteger(intervalMs)||intervalMs<500||intervalMs>30000)throw Error('interval_ms_must_be_500_to_30000');
 const login=await request({port,path:'/api/login',method:'POST',body:{password}});
 if(!login.cookie?.startsWith('fbs_session='))throw Error('missing_session_cookie');
 const samples=[];
 try{
  for(let i=0;i<count;i++){
   if(i)await sleep(intervalMs);
   const [s,e,f]=await Promise.all(['/api/status','/api/enrollment/devices','/api/frames'].map(path=>request({port,path,cookie:login.cookie})));
   samples.push({status:s.json,enrollment:e.json,frames:f.json,now:Date.now()});
  }
  return evaluate(samples,{expected,minAdvance:expected});
 }finally{await request({port,path:'/api/logout',method:'POST',cookie:login.cookie}).catch(()=>{});}
}
async function main(args){
 const [expectedRaw='1',reportPath='m86-stability-report.json',countRaw='4',intervalRaw='2000',portRaw='4177']=args;
 const result=await collect({expected:Number(expectedRaw),count:Number(countRaw),intervalMs:Number(intervalRaw),port:Number(portRaw),password:process.env.FBS_TEACHER_PASSWORD});
 fs.writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error('M86 audit failed:',e.message);process.exitCode=1;});
module.exports={evaluate,collect};
