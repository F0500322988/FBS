'use strict';
// Automated local integration gate; never authorizes remote input.
const fs=require('node:fs');
const path=require('node:path');
const {run:smoke}=require('./M62-Runtime-Smoke');
const {validate:validateTrace}=require('./M72-Session-Trace-Gate');
const {template:traceTemplate}=require('./M72-Session-Trace-Gate');
const prior={stage:'M71',passed:true,liveInputEnabled:false,readyForLiveInput:false,approvedForLiveInput:false};
function evaluate(smokeResult, traceResult){
 const issues=[];
 if(!smokeResult||smokeResult.stage!=='M62'||smokeResult.passed!==true||smokeResult.mode!=='local-demo-only'||smokeResult.liveInputEnabled!==false||!Array.isArray(smokeResult.checks)||smokeResult.checks.length<10||smokeResult.checks.some(c=>c.passed!==true))issues.push('Local server smoke test incomplete or failed');
 if(!traceResult||traceResult.stage!=='M72'||traceResult.passed!==true||traceResult.liveInputEnabled!==false||traceResult.approvedForLiveInput!==false)issues.push('Preview-only session trace failed');
 return {stage:'M73',passed:issues.length===0,scope:'local-demo-integration',realWindowsTested:false,twoPcTested:false,liveInputEnabled:false,approvedForLiveInput:false,checks:{server:issues.every(x=>!x.startsWith('Local')),session:issues.every(x=>!x.startsWith('Preview'))},issues,notice:'Local automated tests only. Not evidence of Windows EXE builds or two physical PCs.'};
}
async function run(){const server=await smoke();const trace=validateTrace(traceTemplate(),prior);return evaluate(server,trace);}
async function main(args){if(args.length>1)throw Error('Usage: node windows/M73-Integration-Gate.js [report.json]');const report=await run();if(args[0]){const target=path.resolve(args[0]);fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n',{flag:'wx'});}console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error('M73: '+e.message);process.exitCode=1;});
module.exports={evaluate,run};
