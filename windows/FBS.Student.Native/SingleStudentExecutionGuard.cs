using System;

namespace FBS.Student.Native;

/// <summary>
/// M49: independent, fail-closed pre-dispatch decision for a single Windows student.
/// This component never calls SendInput. Local approval is never inferred from a
/// teacher command or a readiness JSON report. A stopped session cannot be rearmed.
/// </summary>
public sealed class SingleStudentExecutionGuard
{
    private string? session;
    private bool localArm;
    private bool stopped;
    private DateTimeOffset expiresAt;
    private DateTimeOffset lastAgentContact;

    public void Begin(string sessionId, DateTimeOffset expires, DateTimeOffset now,
        bool studentApproved, bool localOperatorArmed, int targetDeviceCount)
    {
        Stop();
        if (string.IsNullOrWhiteSpace(sessionId) || !studentApproved ||
            !localOperatorArmed || targetDeviceCount != 1 || expires <= now) return;
        session = sessionId;
        expiresAt = expires;
        lastAgentContact = now;
        localArm = true;
        stopped = false;
    }

    public void Heartbeat(string sessionId, DateTimeOffset now)
    {
        if (!stopped && session == sessionId && now >= lastAgentContact)
            lastAgentContact = now;
    }

    public string Evaluate(string sessionId, DateTimeOffset now, bool studentApproved,
        bool studentStopRequested, bool verifiedCommand, bool nativeAdapterEnabled)
    {
        if (studentStopRequested || !studentApproved)
        {
            Stop();
            return "rejected-stopped-or-consent-revoked";
        }
        if (stopped || !localArm || session is null || session != sessionId)
            return "rejected-no-local-arm";
        if (now >= expiresAt || now < lastAgentContact || now - lastAgentContact > TimeSpan.FromSeconds(6))
        {
            Stop();
            return "rejected-expired-or-disconnected";
        }
        if (!verifiedCommand) return "rejected-unverified-command";
        // Hard safety lock: native adapter remains disabled in M49.
        if (!nativeAdapterEnabled) return "verified-dry-run-only";
        return "rejected-native-execution-not-released";
    }

    public void Stop()
    {
        session = null;
        localArm = false;
        stopped = true;
        expiresAt = DateTimeOffset.MinValue;
        lastAgentContact = DateTimeOffset.MinValue;
    }
    public bool IsArmed => localArm && !stopped;
    public bool MayInjectInput => false;
}
