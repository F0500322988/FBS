'use strict';
// Read-only release gate. Does not enable remote input or change machine state.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
function exists(p) { return fs.existsSync(path.join(root, p)); }
function inspectNativeInput() {
  const adapter = fs.readFileSync(path.join(root, 'windows/FBS.Student.Native/WindowsInputAdapter.cs'), 'utf8');
  const gate = fs.readFileSync(path.join(root, 'windows/FBS.Student.Native/ControlInputGate.cs'), 'utf8');
  return {
    adapterExplicitlyDisabled: /EnableForVerifiedSession\s*\([^)]*\)\s*=>\s*enabled\s*=\s*false\s*;/.test(adapter),
    gateExplicitlyDisabled: /public\s+bool\s+InputEnabled\s*=>\s*false\s*;/.test(gate),
    nativeInputWired: false
  };
}
function inspectProject() {
  const paths = ['windows/Build-Installers.ps1','windows/Build-Release.ps1','windows/installer/FBS-Teacher.iss','windows/installer/FBS-Student.iss','windows/FBS.Student.Native/WindowsInputAdapter.cs','windows/FBS.Student.Native/ControlInputGate.cs'];
  const present = Object.fromEntries(paths.map(p => [p, exists(p)]));
  const input = inspectNativeInput();
  return { stage:'M115', platform:process.platform, present, input,
    installerBuildPossibleHere: process.platform === 'win32' && Object.values(present).every(Boolean),
    realRemoteInputReady: false,
    recommendation: 'Build installers on Windows; test teacher/student on two consented machines. Native input remains disabled.' };
}
if (require.main === module) {
  const report = inspectProject();
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode = Object.values(report.present).every(Boolean) ? 0 : 1;
}
module.exports = {inspectProject,inspectNativeInput};
