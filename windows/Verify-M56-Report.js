#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const required = ['Node syntax','Node test suite','C# safety tests','Student Windows build','Teacher Windows build'];
function verify(report, now = Date.now()) {
  const errors = [];
  if (!report || typeof report !== 'object' || Array.isArray(report)) return { ok:false, errors:['Invalid report object'] };
  if (report.stage !== 'M55') errors.push('Unexpected report stage');
  if (report.passed !== true) errors.push('Build report is not marked passed');
  if (report.osInputEnabled !== false) errors.push('Input safety flag must be false');
  if (typeof report.machine !== 'string' || !report.machine.trim()) errors.push('Machine name missing');
  const created = Date.parse(report.generatedAt);
  if (!Number.isFinite(created) || created > now + 300000 || now - created > 7*86400000) errors.push('Report timestamp invalid or stale');
  if (!Array.isArray(report.checks)) errors.push('Checks missing');
  else {
    const names = report.checks.map(c => c && c.name);
    if (names.length !== required.length || required.some((n,i) => names[i] !== n)) errors.push('Missing, reordered or duplicate build checks');
    for (const check of report.checks) {
      if (!check || check.passed !== true || check.exitCode !== 0 || !Number.isInteger(check.durationMs) || check.durationMs < 0) errors.push(`Failed or malformed check: ${check && check.name}`);
    }
  }
  if (report.error !== null) errors.push('Report includes an error');
  return { ok: errors.length === 0, errors };
}
if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error('Usage: node windows/Verify-M56-Report.js <m55-report.json>'); process.exit(2); }
  try {
    const result = verify(JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')));
    console.log(JSON.stringify(result,null,2));
    process.exit(result.ok ? 0 : 1);
  } catch (e) { console.error('Could not read report:',e.message); process.exit(2); }
}
module.exports = { verify, required };
