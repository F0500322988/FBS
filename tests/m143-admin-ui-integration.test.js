const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '..', 'windows/FBS.Student.Native/Program.cs'), 'utf8');
const form = fs.readFileSync(path.join(__dirname, '..', 'windows/FBS.Student.Native/ManagedEnrollmentAdminForm.cs'), 'utf8');
for (const [name, expression] of [
  ['trusted service injection', /ConfigureEnrollmentAdministration\(ManagedEnrollmentCommandService service\)/],
  ['no service by default', /ManagedEnrollmentCommandService\? enrollmentAdministration/],
  ['button hidden by default', /Visible = false/],
  ['button disabled by default', /Enabled = false/],
  ['button enabled after configuration', /manageEnrollment.Enabled = true/],
  ['button shown after configuration', /manageEnrollment.Visible = true/],
  ['UI thread marshal', /if \(InvokeRequired\)/],
  ['disposed check', /ObjectDisposedException/],
  ['null guard on opening', /enrollmentAdministration is null/],
  ['modal local dialog', /dialog.ShowDialog\(this\)/],
  ['button handler', /manageEnrollment.Click \+=/],
  ['form uses injected service', /new ManagedEnrollmentAdminForm\(enrollmentAdministration\)/],
  ['no local admin endpoint', /No network listener/],
]) test(`M143 ${name}`, () => assert.match(name === 'no local admin endpoint' ? form : src, expression));
