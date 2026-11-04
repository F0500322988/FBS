#!/usr/bin/env node
'use strict';
// Offline diagnostics only. Never uploads logs, executes input or changes system settings.
const fs=require('node:fs');
const path=require('node:path');
const rules=[
 {id:'missing-dotnet',pattern:/\.NET 8 SDK is missing|dotnet.*not recognized|dotnet.*not found|SDK.*not found/i,action:'Install .NET 8 SDK (not only the runtime), reopen PowerShell, and run dotnet --list-sdks.'},
 {id:'missing-node',pattern:/Node installed.*False|node.*not recognized|node.*not found|Node\.js is required/i,action:'Install an LTS version of Node.js, reopen PowerShell, and run node --version.'},
 {id:'csharp-compiler',pattern:/\berror CS\d{4}\b/i,action:'Inspect the first C# compiler error and its source line in the local build log; fix it before retrying.'},
 {id:'nuget-restore',pattern:/\berror NU\d{4}\b|Unable to load the service index|NuGet.*restore.*fail/i,action:'Check NuGet connectivity or configured package sources, then run dotnet restore on the failing project.'},
 {id:'project-missing',pattern:/Missing windows\/|Project file does not exist|MSB1009/i,action:'Extract the complete ZIP without changing its folder structure, then rerun from the FBS-Classroom directory.'},
 {id:'windows-only',pattern:/Requires Windows 11|must be run on Windows 11|Windows host.*False/i,action:'Run the PowerShell build check on Windows 11.'},
 {id:'tls-trust',pattern:/certificate.*(mismatch|untrusted)|fingerprint.*(mismatch|missing)/i,action:'Verify the teacher certificate fingerprint out of band; never bypass TLS verification.'}
];
function analyze(diagnostic,log='',buildReport=null){
 if(!diagnostic||diagnostic.stage!=='M57'||!Array.isArray(diagnostic.checks)) throw Error('Invalid M57 diagnostic report');
 const failed=diagnostic.checks.filter(x=>x&&x.passed!==true).map(x=>String(x.name||'unknown'));
 const evidence=[...diagnostic.checks.map(x=>`${x.name||''}: ${x.passed===true?'True':'False'} ${x.detail||''}`),String(diagnostic.failure||''),String(log).slice(0,200000)];
 if(buildReport) evidence.push(JSON.stringify(buildReport).slice(0,50000));
 const content=evidence.join('\n');
 const findings=rules.filter(r=>r.pattern.test(content)).map(r=>({id:r.id,recommendation:r.action}));
 if(!diagnostic.passed && !findings.length) findings.push({id:'unclassified',recommendation:'Inspect the local M57 and M56 logs for the first failure; share only redacted excerpts.'});
 return {stage:'M58',sourceStage:'M57',ready:diagnostic.passed===true&&failed.length===0,liveInputEnabled:false,failedChecks:failed,findings,notice:'Offline advisory only. No Windows build or physical-device test is implied by this analysis.'};
}
function main(args){
 if(args.length<2||args.length>4) throw Error('Usage: node windows/Analyze-M58-Build.js <m57-report.json> <m58-analysis.json> [m57-log.txt] [m56-report.json]');
 const [reportPath,outPath,logPath,buildPath]=args;
 const report=JSON.parse(fs.readFileSync(reportPath,'utf8').replace(/^\uFEFF/,''));
 const log=logPath&&fs.existsSync(logPath)?fs.readFileSync(logPath,'utf8'):'';
 const build=buildPath&&fs.existsSync(buildPath)?JSON.parse(fs.readFileSync(buildPath,'utf8').replace(/^\uFEFF/,'')):null;
 const result=analyze(report,log,build);
 fs.mkdirSync(path.dirname(path.resolve(outPath)),{recursive:true});
 fs.writeFileSync(outPath,JSON.stringify(result,null,2)+'\n');
 process.stdout.write(`M58 report: ${outPath}; ready=${result.ready}; findings=${result.findings.map(f=>f.id).join(',')||'none'}\n`);
 // An incomplete Windows build is expected during diagnosis, not a parser failure.
}
if(require.main===module){try{main(process.argv.slice(2))}catch(e){console.error(`M58 analysis failed: ${e.message}`);process.exitCode=2}}
module.exports={analyze,main};
