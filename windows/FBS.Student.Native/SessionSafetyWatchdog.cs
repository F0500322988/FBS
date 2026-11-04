using System;

namespace FBS.Student.Native;

/// <summary>Pure fail-closed watchdog. Never enables OS input.</summary>
public static class SessionSafetyWatchdog
{
    public static string? StopReason(DateTimeOffset now, DateTimeOffset expiresAt,
        DateTimeOffset lastAgentContact, bool studentApproved, bool localStopRequested)
    {
        if (localStopRequested) return "student-stop";
        if (!studentApproved) return "consent-revoked";
        if (expiresAt <= now) return "session-expired";
        if (lastAgentContact == DateTimeOffset.MinValue ||
            lastAgentContact > now.AddSeconds(2) ||
            now - lastAgentContact > TimeSpan.FromSeconds(6)) return "agent-disconnected";
        return null;
    }
}
