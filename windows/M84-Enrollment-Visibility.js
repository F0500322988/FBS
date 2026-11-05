'use strict';
// Read-only teacher-side enrollment/visibility audit. Never approves devices or controls input.
const http=require('node:http');
const fs=require('node:fs');
function assess(status,enrollment,{expected=21,capacity=40}={}){
 const issues=[];
 if(!Number.isInteger(expected)||expected<1||expected>capacity||capacity>40)issues.push('invalid_expected_count');
 if(!status||!Array.isArray(status.students)||!enrollment||!Array.isArray(enrollment.devices))return {passed:false,issues:['invalid_api_response']};
 const students=status.students, devices=enrollment.devices;
 const ids=new Set();
 for(const s of students){if(typeof s.id!=='string'||!s.id||ids.has(s.id))issues.push('invalid_or_duplicate_student_id');ids.add(s.id);}
 if(students.length>capacity)issues.push('capacity_exceeded');
 if(students.length<expected)issues.push('student_count_below_expected');
 const live=students.filter(s=>s.online===true&&!s.demo);
 const approved=live.filter(s=>s.approved===true);
 const registered=new Set(devices.filter(d=>d.approved===true).map(d=>d.id));
 for(const s of approved)if(!registered.has(s.id))issues.push('approved_device_missing_from_enrollment');
 if(status.mode!=='live')issues.push('not_live_mode');
 if(approved.length<expected)issues.push('approved_online_below_expected');
 if(status.features?.remoteControl!==false)issues.push('remote_input_not_disabled');
 return {stage:'M84',passed:issues.length===0,issues:[...new Set(issues)],expected,capacity,visible:students.length,onlineLive:live.length,approvedOnline:approved.length,registeredApproved:registered.size,note:'Read-only loopback API snapshot; does not prove screen sharing or physical device presence.'};
}
function request({port=4177,path,cookie,method='GET',body}={}){
 return new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port,path,method,headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},timeout:5000},res=>{
   let raw='';res.on('data',chunk=>{raw+=chunk;if(raw.length>1024*1024)req.destroy(Error('response_too_large'));});
   res.on('end',()=>{let json;try{json=JSON.parse(raw);}catch{return reject(Error('invalid_json'));}if(res.statusCode!==200)return reject(Error('http_'+res.statusCode));resolve({json,cookie:res.headers['set-cookie']?.[0]?.split(';')[0]});});
  });req.on('timeout',()=>req.destroy(Error('timeout')));req.on('error',reject);req.end(body?JSON.stringify(body):undefined);
 });
}
async function collect({port=4177,password,expected=21}={}){
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('invalid_port');
 if(typeof password!=='string'||!password)throw Error('FBS_TEACHER_PASSWORD required');
 const login=await request({port,path:'/api/login',method:'POST',body:{password}});
 if(!login.cookie?.startsWith('fbs_session='))throw Error('missing_session_cookie');
 try{
  const [status,enrollment]=await Promise.all([request({port,path:'/api/status',cookie:login.cookie}),request({port,path:'/api/enrollment/devices',cookie:login.cookie})]);
  return assess(status.json,enrollment.json,{expected});
 }finally{await request({port,path:'/api/logout',method:'POST',cookie:login.cookie}).catch(()=>{});}
}
async function main(args){
 const [expectedRaw,reportPath,portRaw]=args;
 const report=await collect({expected:expectedRaw?Number(expectedRaw):21,port:portRaw?Number(portRaw):4177,password:process.env.FBS_TEACHER_PASSWORD});
 if(reportPath)fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error('M84 check failed:',e.message);process.exitCode=1;});
module.exports={assess,collect,request};
