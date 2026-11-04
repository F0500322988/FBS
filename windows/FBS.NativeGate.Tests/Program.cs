using System;
using FBS.Student.Native;

var gate = new ControlInputGate();
var checks = 0;
void Check(bool condition, string message)
{
    if (!condition) throw new Exception("FAIL: " + message);
    Console.WriteLine("PASS: " + message);
    checks++;
}
var now = DateTimeOffset.UtcNow;
Check(!gate.Accept("session-a", 1, "pointer-preview", now), "inactive gate rejects commands");
gate.Activate("session-a", now.AddMinutes(2), studentApproved: false);
Check(!gate.Accept("session-a", 1, "pointer-preview", now), "consent required");
gate.Activate("session-a", now.AddMinutes(2), studentApproved: true);
Check(!gate.Accept("session-b", 1, "pointer-preview", now), "cross-session rejected");
Check(!gate.Accept("session-a", 1, "execute-pointer", now), "unapproved command type rejected");
Check(gate.Accept("session-a", 1, "pointer-preview", now), "first preview accepted");
Check(!gate.Accept("session-a", 1, "pointer-preview", now), "replay rejected");
Check(!gate.Accept("session-a", 0, "key-preview", now), "out-of-order rejected");
gate.Activate("session-a", now.AddMinutes(3), studentApproved: true);
Check(!gate.Accept("session-a", 1, "pointer-preview", now), "refresh does not reset sequence");
Check(gate.Accept("session-a", 2, "key-preview", now), "next sequence accepted");
Check(!gate.Accept("session-a", 3, "key-preview", now.AddMinutes(4)), "expired session rejected");
gate.Deactivate();
Check(!gate.Accept("session-a", 3, "pointer-preview", now), "stop closes gate");
gate.Activate("session-b", now.AddMinutes(2), studentApproved: true);
Check(!gate.Accept("session-a", 4, "pointer-preview", now), "old session rejected after new session");
Check(gate.Accept("session-b", 1, "pointer-preview", now), "new session starts independent sequence");
Check(!gate.InputEnabled, "native input remains disabled");
// M38: a delayed consent/heartbeat cannot resurrect a stopped session.
gate.Deactivate();
Check(gate.IsSessionClosed("session-b"), "stopped session is tombstoned");
gate.Activate("session-b", now.AddMinutes(5), studentApproved: true);
Check(!gate.Accept("session-b", 1, "pointer-preview", now), "delayed approval cannot reopen stopped session");
gate.Activate("session-c", now.AddMinutes(2), studentApproved: true);
Check(gate.Accept("session-c", 1, "pointer-preview", now), "fresh session still works");
gate.Deactivate();
Check(!gate.Accept("session-c", 2, "key-preview", now), "stop immediately blocks next command");
Check(!gate.InputEnabled, "OS injection remains disabled after simulation");
Console.WriteLine($"M36 native gate: {checks} checks passed. NO OS INPUT INJECTED.");

using var good = System.Text.Json.JsonDocument.Parse("{\"sessionId\":\"session-c\",\"sequence\":2,\"at\":" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() + ",\"type\":\"key-preview\",\"key\":\"A\"}");
Check(PreviewPayloadPolicy.Valid(good.RootElement,"session-c",DateTimeOffset.UtcNow),"M39 native valid key preview");
using var bad = System.Text.Json.JsonDocument.Parse("{\"sessionId\":\"session-c\",\"sequence\":3,\"at\":" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() + ",\"type\":\"key-preview\",\"key\":\"Enter\"}");
Check(!PreviewPayloadPolicy.Valid(bad.RootElement,"session-c",DateTimeOffset.UtcNow),"M39 native blocks special keys");

// M40: run a complete native decision without ever calling SendInput.
var dryGate = new ControlInputGate();
var dryRun = new InputDryRun(dryGate);
var dryNow = DateTimeOffset.UtcNow;
var payload = "{\"sessionId\":\"m40\",\"sequence\":1,\"at\":" + dryNow.ToUnixTimeMilliseconds() + ",\"type\":\"key-preview\",\"key\":\"A\"}";
using var dryDoc = System.Text.Json.JsonDocument.Parse(payload);
Check(dryRun.Evaluate(dryDoc.RootElement, "m40", dryNow) == "rejected-session-or-replay", "M40 rejects before consent");
dryGate.Activate("m40", dryNow.AddMinutes(1), studentApproved: true);
Check(dryRun.Evaluate(dryDoc.RootElement, "m40", dryNow) == "accepted-preview-only", "M40 accepts preview after consent");
Check(dryRun.Evaluate(dryDoc.RootElement, "m40", dryNow) == "rejected-session-or-replay", "M40 rejects replay");
dryGate.Deactivate();
Check(dryRun.Evaluate(dryDoc.RootElement, "m40", dryNow) == "rejected-session-or-replay", "M40 rejects after stop");
Check(!dryGate.InputEnabled, "M40 OS injection disabled");

// M41: native watchdog is fail-closed and never enables SendInput.
var watchNow = DateTimeOffset.UtcNow;
Check(SessionSafetyWatchdog.StopReason(watchNow, watchNow.AddMinutes(1), watchNow, true, false) is null, "M41 healthy session stays preview-only");
Check(SessionSafetyWatchdog.StopReason(watchNow, watchNow.AddMinutes(1), watchNow, true, true) == "student-stop", "M41 local student stop wins");
Check(SessionSafetyWatchdog.StopReason(watchNow, watchNow.AddMinutes(1), watchNow, false, false) == "consent-revoked", "M41 revoked consent closes session");
Check(SessionSafetyWatchdog.StopReason(watchNow, watchNow, watchNow, true, false) == "session-expired", "M41 expiry closes session");
Check(SessionSafetyWatchdog.StopReason(watchNow, watchNow.AddMinutes(1), watchNow.AddSeconds(-7), true, false) == "agent-disconnected", "M41 stale agent closes session");
Check(SessionSafetyWatchdog.StopReason(watchNow, watchNow.AddMinutes(1), DateTimeOffset.MinValue, true, false) == "agent-disconnected", "M41 missing heartbeat closes session");
Check(!dryGate.InputEnabled, "M41 no OS input injection");

// M45: bounded audit stores decisions only, never input payloads.
var audit = new NativePreviewAudit();
audit.Record("accepted-preview-only");
audit.Record("rejected-payload");
Check(audit.Accepted == 1 && audit.Rejected == 1, "M45 counts accepted and rejected previews");
for (var i = 0; i < 100; i++) audit.Record("untrusted-secret-key-value");
Check(audit.Count == 30, "M45 bounds diagnostic log to 30 entries");
Check(!string.Join(" ", audit.Entries).Contains("secret"), "M45 never stores arbitrary payload values");
audit.Reset();
Check(audit.Count == 0 && audit.Accepted == 0 && audit.Rejected == 0, "M45 resets diagnostics on session change");

// M49: exercise the exact native guard compiled into the student app.
var guard = new SingleStudentExecutionGuard();
var t49 = DateTimeOffset.UtcNow;
Check(guard.Evaluate("s49", t49, true, false, true, false) == "rejected-no-local-arm", "M49 no input without local arm");
guard.Begin("s49", t49.AddMinutes(1), t49, true, false, 1);
Check(!guard.IsArmed, "M49 teacher consent alone cannot arm");
guard.Begin("s49", t49.AddMinutes(1), t49, true, true, 2);
Check(!guard.IsArmed, "M49 multi-device arm rejected");
guard.Begin("s49", t49.AddMinutes(1), t49, true, true, 1);
Check(guard.IsArmed, "M49 one locally approved student can enter dry-run");
Check(guard.Evaluate("other", t49, true, false, true, false) == "rejected-no-local-arm", "M49 cross-session rejected");
Check(guard.Evaluate("s49", t49, true, false, false, false) == "rejected-unverified-command", "M49 unverified command rejected");
Check(guard.Evaluate("s49", t49, true, false, true, false) == "verified-dry-run-only", "M49 verified command is dry-run only");
Check(guard.Evaluate("s49", t49, true, false, true, true) == "rejected-native-execution-not-released", "M49 injection remains blocked even if adapter is enabled");
Check(guard.Evaluate("s49", t49.AddSeconds(7), true, false, true, false) == "rejected-expired-or-disconnected", "M49 stale heartbeat stops session");
Check(!guard.IsArmed, "M49 disconnected session disarmed");
guard.Begin("new49", t49.AddMinutes(1), t49, true, true, 1);
Check(guard.Evaluate("new49", t49, true, true, true, false) == "rejected-stopped-or-consent-revoked", "M49 student stop wins");
Check(!guard.MayInjectInput, "M49 native injection always disabled");
Console.WriteLine("M49 native pre-dispatch guard passed; no OS input executed.");

// M50: native end-to-end decision pipeline; no SendInput calls.
var p50 = new VerifiedPreviewPipeline();
var t50 = DateTimeOffset.UtcNow;
var cmd50 = "{\"sessionId\":\"m50-a\",\"sequence\":1,\"at\":" + t50.ToUnixTimeMilliseconds() + ",\"type\":\"key-preview\",\"key\":\"A\"}";
using var doc50 = System.Text.Json.JsonDocument.Parse(cmd50);
Check(p50.Preview(doc50.RootElement, "m50-a", t50, true, false) != "accepted-preview-only", "M50 rejects unarmed command");
Check(p50.Accepted == 0 && p50.Rejected == 1, "M50 counts unarmed rejection before a session begins");
p50.Begin("m50-a", t50.AddMinutes(1), t50, true, true, 1);
Check(p50.IsArmed, "M50 locally armed one student");
Check(p50.Accepted == 0 && p50.Rejected == 0, "M50 new session starts with a fresh audit");
Check(p50.Preview(doc50.RootElement, "m50-a", t50, true, false) == "accepted-preview-only", "M50 verified preview accepted");
Check(p50.Preview(doc50.RootElement, "m50-a", t50, true, false) == "rejected-session-or-replay", "M50 replay blocked");
Check(p50.Accepted == 1 && p50.Rejected == 1, "M50 counts current-session decisions without payload logging");
Check(p50.Preview(doc50.RootElement, "m50-a", t50, true, true) != "accepted-preview-only", "M50 stop blocks preview");
Check(!p50.IsArmed && p50.Accepted == 0, "M50 stop disarms and clears audit");
Check(p50.Rejected == 1, "M50 records the stop rejection after clearing the prior session audit");
p50.Stop();
Check(p50.Accepted == 0 && p50.Rejected == 0, "M50 explicit stop clears all audit counters");
p50.Begin("m50-a", t50.AddMinutes(1), t50, true, true, 1);
Check(!p50.IsArmed, "M50 old session cannot rearm");
p50.Begin("m50-b", t50.AddMinutes(1), t50, true, true, 2);
Check(!p50.IsArmed, "M50 multi-target disallowed");
p50.Begin("m50-b", t50.AddMinutes(1), t50, true, true, 1);
Check(p50.IsArmed, "M50 fresh single session allowed");
Check(p50.Preview(doc50.RootElement, "m50-b", t50, true, false) != "accepted-preview-only", "M50 cross-session payload rejected");
Check(p50.Preview(doc50.RootElement, "m50-b", t50.AddSeconds(7), true, false) != "accepted-preview-only", "M50 disconnected session rejected");
Check(!p50.IsArmed && !p50.MayInjectInput, "M50 fail-closed and injection disabled");
Console.WriteLine("M50 native preview pipeline passed; NO OS INPUT INJECTED.");

// M53: remote state cannot grant local consent; delayed confirmations cannot reopen stopped sessions.
var latch = new LocalConsentLatch();
Check(latch.Observe("m53-a"), "M53 observes first session");
Check(!latch.CanPreview("m53-a"), "M53 server consent state alone cannot arm preview");
Check(latch.BeginApproval("m53-a"), "M53 begins local approval request");
Check(!latch.CanPreview("m53-a"), "M53 pending approval is not sufficient");
Check(latch.ConfirmApproval("m53-a", true), "M53 successful local response confirms approval");
Check(latch.CanPreview("m53-a"), "M53 locally confirmed session can preview");
latch.Close("m53-a");
Check(!latch.CanPreview("m53-a"), "M53 stop revokes consent immediately");
Check(!latch.Observe("m53-a"), "M53 stale server response cannot reopen stopped session");
Check(!latch.ConfirmApproval("m53-a", true), "M53 delayed confirmation cannot reopen stopped session");
Check(latch.Observe("m53-b"), "M53 new session can be observed");
Check(!latch.CanPreview("m53-b"), "M53 consent does not transfer to new session");
Check(latch.BeginApproval("m53-b"), "M53 new approval started");
Check(!latch.ConfirmApproval("m53-b", false), "M53 failed request cannot grant approval");
Check(!latch.Observe("m53-b"), "M53 failed request closes session");
Console.WriteLine("M53 local consent latch checks complete. NO OS INPUT INJECTED.");
