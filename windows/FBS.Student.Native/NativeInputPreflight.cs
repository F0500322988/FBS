using System;
using System.Text.Json;

namespace FBS.Student.Native;

/// <summary>
/// M122: final fail-closed policy check immediately before a future native dispatch.
/// This component never invokes SendInput and never enables WindowsInputAdapter.
/// </summary>
public sealed class NativeInputPreflight
{
    private string? activeSession;
    private long lastSequence;
    private DateTimeOffset expiry;
    private bool stopped = true;

    public bool Begin(string sessionId, DateTimeOffset expires, DateTimeOffset now,
        bool deviceEnrolled, bool teacherAuthenticated, bool localAgentAuthenticated,
        bool indicatorVisible, bool operatorAuthorized)
    {
        Stop();
        if (string.IsNullOrWhiteSpace(sessionId) || expires <= now ||
            expires - now > TimeSpan.FromMinutes(2) || !deviceEnrolled ||
            !teacherAuthenticated || !localAgentAuthenticated ||
            !indicatorVisible || !operatorAuthorized) return false;
        activeSession = sessionId;
        expiry = expires;
        stopped = false;
        return true;
    }

    public string Evaluate(JsonElement command, string sessionId, DateTimeOffset now,
        bool agentConnected, bool indicatorVisible, bool localStopRequested)
    {
        if (localStopRequested || !agentConnected || !indicatorVisible || now >= expiry)
        {
            Stop();
            return "rejected-revoked";
        }
        if (stopped || activeSession is null ||
            !string.Equals(activeSession, sessionId, StringComparison.Ordinal))
            return "rejected-session";
        if (!PreviewPayloadPolicy.Valid(command, sessionId, now) ||
            !command.TryGetProperty("sequence", out var seq) ||
            !seq.TryGetInt64(out var sequence) || sequence <= lastSequence)
            return "rejected-payload-or-replay";
        lastSequence = sequence;
        return "accepted-dry-run-only";
    }

    public void Stop()
    {
        activeSession = null;
        lastSequence = 0;
        expiry = DateTimeOffset.MinValue;
        stopped = true;
    }

    public bool IsActive => !stopped && activeSession is not null;

    public bool NativeInputEnabled => false;
}
