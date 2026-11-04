# FBS Classroom M9 — Remote-control session groundwork

M9 adds an authenticated, short-lived **control request** endpoint for online enrolled-in-roster students.
It does **not** send mouse/keyboard input and does **not** install a native Windows controller.
This prevents misleading users into thinking the remote-control feature is ready.

Endpoints (teacher local loopback only):
- `POST /api/control/request` with JSON `{"deviceId":"PC-01"}` (teacher login required)
- `POST /api/control/cancel` with JSON `{"deviceId":"PC-01"}` (teacher login required)
- `GET /api/control/sessions` (teacher login required)
Requests expire in 60 seconds. Audit is in-memory only and is lost on restart.
Origin checks apply to mutating control routes. There is no agent-side acceptance or native input execution.

Run with the same M8 teacher password and M7 TLS settings.
Next development milestone: per-device enrollment and revocation, then a signed native Windows
interactive-session agent with an always-visible control indicator, explicit teacher identity,
secure command validation, local emergency stop, and tests on a single machine.

SECURITY: M9 is a developer preview. Do not use for real remote control or production deployment.
