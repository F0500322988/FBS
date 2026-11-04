'use strict';
const fs=require('node:fs');
const path=require('node:path');
function check(root=path.resolve(__dirname,'..')) {
 const p=(f)=>fs.readFileSync(path.join(root,f),'utf8');
 const policy=p('windows/FBS.Student.Native/ManagedControlPolicy.cs');
 const adapter=p('windows/FBS.Student.Native/WindowsInputAdapter.cs');
 const installer=p('windows/Build-Installers.ps1');
 const checks={
  locallyProvisioned:policy.includes('locallyProvisioned')&&policy.includes('deviceEnrolled'),
  teacherBound:policy.includes('teacherId != provisionedTeacherId'),
  visibleIndicator:policy.includes('studentIndicatorVisible')&&policy.includes('IndicatorRequired'),
  emergencyStop:policy.includes('StudentEmergencyStop()')&&policy.includes('studentStopped = true'),
  timeout:policy.includes('TimeSpan.FromMinutes(2)')&&policy.includes('now < expires'),
  disconnectStops:policy.includes('!networkConnected) { Stop();'),
  inputStillDisabled:policy.includes('NativeInputEnabled => false')&&/EnableForVerifiedSession\s*\(bool explicitlyEnabledByOperator\)\s*=>\s*enabled = false;/.test(adapter),
  installerScript:['M76-Teacher.iss','M76-Student.iss'].every(name=>installer.includes(name)&&fs.existsSync(path.join(root,'windows','installer',name)))
 };
 return {stage:'M116',passed:Object.values(checks).every(Boolean),checks,warning:'This is a managed authorization foundation, NOT working remote mouse/keyboard control or built EXE installers.'};
}
if(require.main===module){const result=check();console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;}
module.exports={check};
