'use strict';
// M46: evidence-only release gate. This module cannot enable native input.
const REQUIRED = ['nodeTests', 'nativeTests', 'studentBuild', 'teacherBuild', 'tlsPinVerified', 'studentConsentObserved', 'studentStopObserved', 'disconnectStopObserved'];
function evaluateEvidence(report, now = Date.now()) {
  const problems = [];
  if (!report || typeof report !== 'object' || Array.isArray(report)) return { ready: false, problems: ['invalid-report'] };
  if (report.stage !== 'M46') problems.push('wrong-stage');
  const timestamp = Date.parse(report.timestamp);
  if (!Number.isFinite(timestamp) || timestamp > now + 120000 || now - timestamp > 24 * 60 * 60 * 1000) problems.push('stale-or-invalid-timestamp');
  for (const field of REQUIRED) if (report[field] !== 'passed') problems.push('missing-or-failed:' + field);
  if (report.realWindowsTwoPc !== true) problems.push('two-real-windows-pcs-not-confirmed');
  return { ready: problems.length === 0, problems, note: 'Evidence review only; never authorizes OS input injection or deployment.' };
}
module.exports = { evaluateEvidence, REQUIRED };
if (require.main === module) {
  const fs = require('node:fs');
  try {
    const report = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
    const result = evaluateEvidence(report);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ready ? 0 : 2;
  } catch (e) { console.error('Invalid evidence:', e.message); process.exitCode = 2; }
}
