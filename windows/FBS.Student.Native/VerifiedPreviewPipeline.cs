using System;
using System.Text.Json;

namespace FBS.Student.Native;

/// <summary>
/// M50 single-device preview pipeline: payload -> replay gate -> local guard -> audit.
/// Never invokes WindowsInputAdapter or operating-system input APIs.
/// </summary>
public sealed class VerifiedPreviewPipeline
{
    private readonly ControlInputGate gate = new();
    private readonly InputDryRun dryRun;
    private readonly SingleStudentExecutionGuard guard = new();
    private readonly NativePreviewAudit audit = new();
    private string? activeSession;
    private string? lastStoppedSession;

    public VerifiedPreviewPipeline() => dryRun = new InputDryRun(gate);

    public void Begin(string sessionId, DateTimeOffset expiry, DateTimeOffset now,
        bool studentApproved, bool localOperatorArmed, int targetDeviceCount)
    {
        if (sessionId == lastStoppedSession) return;
        Stop();
        if (!studentApproved || !localOperatorArmed || targetDeviceCount != 1 ||
            string.IsNullOrWhiteSpace(sessionId) || expiry <= now) return;
        gate.Activate(sessionId, expiry, studentApproved: true);
        if (gate.IsSessionClosed(sessionId)) return;
        guard.Begin(sessionId, expiry, now, studentApproved, localOperatorArmed, targetDeviceCount);
        if (!guard.IsArmed) { gate.Deactivate(); return; }
        activeSession = sessionId;
    }

    public void Heartbeat(string sessionId, DateTimeOffset now) => guard.Heartbeat(sessionId, now);

    public string Preview(JsonElement command, string sessionId, DateTimeOffset now,
        bool studentApproved, bool studentStopRequested)
    {
        // Check revocation and liveness BEFORE consuming a sequence number.
        var check = guard.Evaluate(sessionId, now, studentApproved, studentStopRequested,
            verifiedCommand: false, nativeAdapterEnabled: false);
        if (check != "rejected-unverified-command")
        {
            if (studentStopRequested || !studentApproved || check == "rejected-expired-or-disconnected") Stop();
            audit.Record(check);
            return check;
        }
        if (activeSession != sessionId) { audit.Record("rejected-session"); return "rejected-session"; }
        var decision = dryRun.Evaluate(command, sessionId, now);
        if (decision != "accepted-preview-only") { audit.Record(decision); return decision; }
        var guardResult = guard.Evaluate(sessionId, now, studentApproved, false,
            verifiedCommand: true, nativeAdapterEnabled: false);
        var result = guardResult == "verified-dry-run-only" ? "accepted-preview-only" : guardResult;
        audit.Record(result);
        return result;
    }

    public void Stop()
    {
        if (activeSession is not null) lastStoppedSession = activeSession;
        gate.Deactivate();
        guard.Stop();
        activeSession = null;
        audit.Reset();
    }

    public bool MayInjectInput => false;
    public bool IsArmed => guard.IsArmed;
    public int Accepted => audit.Accepted;
    public int Rejected => audit.Rejected;
}
