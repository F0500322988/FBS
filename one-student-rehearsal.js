'use strict';
// M47: a review-only, single-student rehearsal report. NEVER enables native input.
const fs = require('node:fs');
const { evaluateEvidence } = require('./readiness-evidence');
const REQUIRED = ['studentDiscovered','studentEnrolled','tlsPinVerified','consentShown','consentGranted','previewDelivered','studentStopObserved','staleCommandRejected','disconnectStopObserved'];
function reviewRehearsal(report, now = Date.now()) {
  const problems = [];
  if (!report || typeof report !== 'object' || Array.isArray(report)) return {ready:false,problems:['invalid-report']};
  if (report.stage !== 'M47') problems.push('wrong-stage');
  const timestamp = Date.parse(report.timestamp);
  if (!Number.isFinite(timestamp) || timestamp > now + 120000 || now - timestamp > 24*3600000) problems.push('stale-or-invalid-timestamp');
  if (report.platform !== 'Windows 11') problems.push('wrong-platform');
  if (report.studentCount !== 1) problems.push('not-exactly-one-student');
  if (typeof report.teacherHost !== 'string' || !report.teacherHost.trim() || typeof report.studentHost !== 'string' || !report.studentHost.trim() || report.teacherHost === report.studentHost) problems.push('invalid-host-pair');
  if (report.observerConfirmed !== true) problems.push('observer-not-confirmed');
  for (const field of REQUIRED) if (report[field] !== 'passed') problems.push('missing-or-failed:'+field);
  if (report.nativeInputEnabled !== false) problems.push('native-input-must-remain-disabled');
  const base = report.m46Evidence;
  if (!base || typeof base !== 'object') problems.push('missing-m46-evidence');
  else {
    const check = evaluateEvidence(base, now);
    if (!check.ready) problems.push(...check.problems.map(x=>'m46:'+x));
  }
  return {ready:problems.length===0,problems,note:'Review-only rehearsal result. Never enables native input or authorizes deployment.'};
}
module.exports = {reviewRehearsal,REQUIRED};
if (require.main === module) {
  try {
    const report = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
    const result = reviewRehearsal(report);
    console.log(JSON.stringify(result,null,2));
    process.exitCode = result.ready ? 0 : 2;
  } catch (e) {console.error('Invalid rehearsal:',e.message);process.exitCode=2;}
}
