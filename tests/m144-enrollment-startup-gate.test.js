const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.join(__dirname, '..', 'windows', 'FBS.Student.Native');
const gate = fs.readFileSync(path.join(base, 'EnrollmentStartupGate.cs'), 'utf8');
const app = fs.readFileSync(path.join(base, 'Program.cs'), 'utf8');
const cases = [
 ['one-shot startup gate', gate, /class EnrollmentStartupGate/],
 ['reject null service', gate, /service is null/],
 ['reject duplicate activation', gate, /active \|\| closed/],
 ['explicit close', gate, /public void Close\(\)/],
 ['closed state permanent', gate, /closed = true/],
 ['thread synchronization', gate, /lock \(sync\)/],
 ['status checks closed', gate, /active && !closed/],
 ['in-process typed service', gate, /ManagedEnrollmentCommandService\? service/],
 ['app constructs gate', app, /new\(\);\s*\/\/ M143|private readonly EnrollmentStartupGate enrollmentStartup = new\(\)/],
 ['app gates activation', app, /enrollmentStartup.TryActivate\(service\)/],
 ['app gates opening', app, /!enrollmentStartup.IsActive/],
 ['app closes on form exit', app, /FormClosed \+= \(_, _\) => enrollmentStartup.Close\(\)/],
 ['no default UI access', app, /Visible = false/],
 ['no default enabled admin button', app, /Enabled = false/],
];
for (const [name, source, pattern] of cases) test('M144 '+name, () => assert.match(source, pattern));
