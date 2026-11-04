'use strict';
// Read-only check: verifies both locally observed launch reports and a fresh teacher-side enrollment snapshot.
const fs=require('node:fs');
const {verify:verifyStartup}=require('./M100-Verify-Report');
const {collect}=require('./M84-Enrollment-Visibility');
function assess(teacher,student,enrollment,expected=1){
 const issues=[];
 if(!Number.isInteger(expected)||expected<1||expected>40)issues.push('invalid_expected');
 if(!verifyStartup(teacher).passed||teacher?.role!=='Teacher')issues.push('teacher_startup_invalid');
 if(!verifyStartup(student).passed||student?.role!=='Student')issues.push('student_startup_invalid');
 if(!enrollment||enrollment.stage!=='M84'||enrollment.passed!==true)issues.push('enrollment_failed');
 if(enrollment?.expected!==expected)issues.push('enrollment_count_mismatch');
 if(enrollment?.approvedOnline<expected)issues.push('approved_online_below_expected');
 if(enrollment?.issues?.length)issues.push('enrollment_issues');
 return {stage:'M101',passed:issues.length===0,issues,expected,teacherStartupVerified:!issues.includes('teacher_startup_invalid'),studentStartupVerified:!issues.includes('student_startup_invalid'),enrollmentVerified:!issues.includes('enrollment_failed')&&!issues.includes('enrollment_count_mismatch'),remoteInputEnabled:false,scope:'read_only_teacher_loopback_and_operator_startup_reports',note:'M100 startup reports are operator attestations, not cryptographic device identity; M84 is a current teacher API snapshot, not a visual UI test.'};
}
async function main(args){
 const [teacherPath,studentPath,expectedRaw='1',output='m101-installed-pair.json',portRaw='4177']=args;
 if(!teacherPath||!studentPath)throw Error('Usage: node M101-Installed-Pair-Check.js teacher-m100.json student-m100.json [expected=1] [output] [port=4177]');
 const expected=Number(expectedRaw),port=Number(portRaw);
 if(!Number.isInteger(expected)||expected<1||expected>40)throw Error('invalid_expected');
 const teacher=JSON.parse(fs.readFileSync(teacherPath,'utf8'));
 const student=JSON.parse(fs.readFileSync(studentPath,'utf8'));
 // Refuse to contact server if local startup evidence is invalid.
 const local=assess(teacher,student,{stage:'M84',passed:true,expected,approvedOnline:expected,issues:[]},expected);
 if(!local.passed)throw Error('startup_reports_invalid: '+local.issues.join(','));
 const enrollment=await collect({expected,port,password:process.env.FBS_TEACHER_PASSWORD});
 const report=assess(teacher,student,enrollment,expected);
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error('M101 failed:',e.message);process.exitCode=1;});
module.exports={assess};
