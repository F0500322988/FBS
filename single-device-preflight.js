'use strict';
// M48: review-only authorization checklist. No native input can be enabled here.
const fs = require('node:fs');
const { reviewRehearsal } = require('./one-student-rehearsal');
const REQUIRED = ['nativeBuildVerified','nativeTestsVerified','teacherBuildVerified','studentCanStop','disconnectFailsClosed','expiryFailsClosed','replayRejected','tlsIdentityVerified'];
function reviewPreflight(report, now = Date.now()) {
  const problems = [];
  if (!report || typeof report !== 'object' || Array.isArray(report)) return { readyForSupervisedReview:false, inputEnabled:false, problems:['invalid-report'] };
  if (report.stage !== 'M48') problems.push('wrong-stage');
  const t = Date.parse(report.timestamp);
  if (!Number.isFinite(t) || t > now + 120000 || now - t > 3600000) problems.push('stale-or-invalid-timestamp');
  if (report.platform !== 'Windows 11' || report.studentCount !== 1) problems.push('not-single-windows-student');
  if (report.operatorPresent !== true || report.studentPresent !== true || report.studentExplicitlyConsented !== true) problems.push('missing-local-human-confirmation');
  if (report.nativeInputEnabled !== false) problems.push('native-input-must-remain-disabled');
  if (typeof report.teacherHost !== 'string' || !report.teacherHost.trim() || typeof report.studentHost !== 'string' || !report.studentHost.trim() || report.teacherHost === report.studentHost) problems.push('invalid-host-pair');
  for (const k of REQUIRED) if (report[k] !== 'passed') problems.push('missing-or-failed:'+k);
  const rehearsal = reviewRehearsal(report.m47Evidence, now);
  if (!rehearsal.ready) problems.push(...rehearsal.problems.map(x=>'m47:'+x));
  if (report.m47Evidence && (report.teacherHost !== report.m47Evidence.teacherHost || report.studentHost !== report.m47Evidence.studentHost)) problems.push('host-mismatch-with-m47');
  // Review status is NOT an enable token; the native adapter remains hard-disabled.
  return { readyForSupervisedReview:problems.length===0, inputEnabled:false, problems, note:'Manual evidence review only. Never enables Windows input injection.' };
}
module.exports = { reviewPreflight, REQUIRED };
if (require.main === module) {
  try {const result=reviewPreflight(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));console.log(JSON.stringify(result,null,2));process.exitCode=result.readyForSupervisedReview?0:2;}
  catch(e){console.error('Invalid preflight:',e.message);process.exitCode=2;}
}
