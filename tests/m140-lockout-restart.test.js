const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.join(__dirname, '..', 'windows');
const service = fs.readFileSync(path.join(base, 'FBS.Student.Native', 'AuthenticatedEnrollmentService.cs'), 'utf8');
const smoke = fs.readFileSync(path.join(base, 'FBS.NativeSafety.Smoke', 'Program.cs'), 'utf8');
for (const [name, pattern] of [
  ['strict restart factory', /static AuthenticatedEnrollmentService OpenExisting\(/],
  ['missing state fail closed', /else if \(requireExisting\) lockedDown = true/],
  ['strict path validation', /Lockout path is required/],
  ['runtime test invoked', /TestM140MissingLockoutState\(\);/],
  ['missing state tested', /M140 missing lockout state fails closed/],
  ['denied enrollment tested', /M140 missing state denies enrollment/],
  ['corrupt state tested', /M140 corrupt lockout state fails closed/],
  ['reopen valid tested', /M140 existing lockout state loads/],
]) test(name, () => assert.match(name.includes('tested') || name.includes('invoked') ? smoke : service, pattern));
