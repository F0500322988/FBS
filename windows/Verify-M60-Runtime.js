// Offline distribution completeness check. Does not launch or enable remote control.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=process.argv[2];
const required=['Teacher/FBS.Teacher.exe','Student/FBS.Student.Native.exe','Runtime/node.exe','Runtime/server.js','Runtime/student-agent.js','Runtime/teacher-lan.js','Runtime/control-commands.js','Runtime/control-lease.js','Runtime/control-session-state.js','Runtime/preview-validation.js','Runtime/device-identity.js','Runtime/enrollment.js','Runtime/lan.js','Runtime/local-control-auth.js','Runtime/Start-Student-Agent.ps1','Runtime/public/index.html'];
required.push('Runtime/authenticated-preview-transport.js','Runtime/authenticated-preview-channel.js','Runtime/public/app.js','Runtime/public/style.css',
 'Runtime/classroom-broadcast.js','Runtime/classroom-messages.js','Runtime/teacher-endpoint.js','Runtime/pinned-https.js',
 ...['m105-events','m106-alerts','m107-priority','m108-groups','m109-custom-groups','m110-seat-map','m111-seat-transfer','m112-seat-management','m113-seat-drag','m114-seat-view'].map(name=>'Runtime/public/'+name+'.js'));
function verify(dir){if(!dir) return {ok:false,missing:['distribution path']};const missing=required.filter(p=>{try{const stat=fs.lstatSync(path.join(dir,p));return !stat.isFile()||stat.isSymbolicLink()||stat.size===0}catch{return true}});return {ok:missing.length===0,missing};}
if(require.main===module){const result=verify(root);console.log(JSON.stringify(result,null,2));process.exitCode=result.ok?0:1;}
module.exports={verify,required};
