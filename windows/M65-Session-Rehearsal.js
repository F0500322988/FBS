'use strict';
// Deterministic, non-networked session rehearsal. NEVER sends native input.
const fs = require('node:fs');
const {assess} = require('./M64-Safety-Gate');
const path = require('node:path');
const EVENTS = Object.freeze(['connect','consent','preview','stop','disconnect','reconnect','timeout','input']);
function rehearse(events) {
  if (!Array.isArray(events) || events.length > 100) throw Error('events must be an array of at most 100 items');
  let connected=false, consent=false, preview=false, stopped=false;
  const trace=[];
  for (const event of events) {
    if (typeof event !== 'string' || !EVENTS.includes(event)) throw Error('unknown event');
    let accepted=false;
    switch(event) {
      case 'connect': connected=true; consent=false; preview=false; stopped=false; accepted=true; break;
      case 'consent': if(connected&&!stopped){consent=true;accepted=true;} break;
      case 'preview': if(connected&&consent&&!stopped){preview=true;accepted=true;} break;
      case 'stop': stopped=true;consent=false;preview=false;accepted=true;break;
      case 'disconnect': connected=false;consent=false;preview=false;accepted=true;break;
      case 'reconnect': connected=true;consent=false;preview=false;stopped=false;accepted=true;break;
      case 'timeout': consent=false;preview=false;accepted=true;break;
      case 'input': accepted=false;break; // input always disabled, even with consent
    }
    trace.push({event,accepted,connected,consent,preview,liveInputEnabled:false});
  }
  return {stage:'M65',simulationOnly:true,liveInputEnabled:false,trace,final:{connected,consent,preview},passed:trace.every(x=>x.event!=='input'||!x.accepted)};
}
const SCENARIOS = {
  'consent-preview-stop':['connect','preview','consent','preview','stop','preview','input'],
  'disconnect-reconsent':['connect','consent','preview','disconnect','reconnect','preview','consent','preview','input'],
  'timeout':['connect','consent','preview','timeout','preview','input'],
  'input-blocked':['connect','consent','preview','input','stop','input']
};
function main(args) {
  if(args.length!==4) throw Error('Usage: node windows/M65-Session-Rehearsal.js teacher.json student.json scenario output.json');
  const [teacherPath,studentPath,scenario,out]=args;
  if(!Object.hasOwn(SCENARIOS,scenario)) throw Error('Unknown scenario');
  if([teacherPath,studentPath].some(p=>path.resolve(p)===path.resolve(out))) throw Error('Cannot overwrite evidence');
  const teacher=JSON.parse(fs.readFileSync(teacherPath,'utf8'));
  const student=JSON.parse(fs.readFileSync(studentPath,'utf8'));
  const source=fs.readFileSync(path.join(__dirname,'FBS.Student.Native','WindowsInputAdapter.cs'),'utf8');
  const gate=assess(teacher,student,source);
  const result={...rehearse(SCENARIOS[scenario]),scenario,fieldSafetyReviewPassed:gate.reviewPassed,passed:gate.reviewPassed&&rehearse(SCENARIOS[scenario]).passed};
  fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({stage:'M65',scenario,passed:result.passed,simulationOnly:true,liveInputEnabled:false,report:out},null,2));
  if(!result.passed)process.exitCode=1;
}
if(require.main===module){try{main(process.argv.slice(2))}catch(err){console.error('M65 rehearsal failed: '+err.message);process.exitCode=1;}}
module.exports={rehearse,SCENARIOS,EVENTS};
