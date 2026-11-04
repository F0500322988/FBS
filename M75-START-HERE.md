# FBS Classroom — M75: Native Windows launch evidence

M75 separates **offline package completeness** from **human-observed Windows EXE launches**. It does not automatically launch or validate the EXEs, and does not enable remote input.

1. On Windows 11 build `dist-m60` using `windows/Test-M60-Runtime.ps1` and run `windows/Test-M75-Native-Launch.ps1 -Role Teacher` or `-Role Student` on the appropriate PC. This checks package completeness only.
2. Launch the corresponding EXE manually. The teacher requires `FBS_PAIRING_KEY`, `FBS_TEACHER_PASSWORD`, `FBS_TLS_CERT`, and `FBS_TLS_KEY` configured. Check the teacher browser and student consent/stop UI.
3. Create independent observation templates:
   `node windows/M75-Native-Launch-Evidence.js template Teacher m75-teacher.json`
   `node windows/M75-Native-Launch-Evidence.js template Student m75-student.json`
4. On each PC record a distinct `deviceId`, actual ISO timestamp `observedAt`, and set checks to `PASS` **only after personally verifying**. Do not fill `PASS` for untested behavior.
5. Copy both evidence files to one machine and run:
   `node windows/M75-Native-Launch-Evidence.js verify m75-teacher.json m75-student.json m75-report.json`

`passed: true` confirms the supplied human observations are complete and internally consistent, **not** independent verification of Windows operation. Never send secrets or TLS private keys with evidence. M75 does not approve live keyboard/mouse input.
