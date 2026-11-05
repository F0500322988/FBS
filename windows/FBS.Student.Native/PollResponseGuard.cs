using System;

namespace FBS.Student.Native;

/// <summary>
/// M126: reject a local-agent poll reply if a stop happened while HTTP was pending.
/// This guard is fail-closed and never enables native input.
/// </summary>
public static class PollResponseGuard
{
    public static bool MayApply(long requestGeneration, long currentGeneration,
        string? stoppedSession, string? incomingSession, DateTimeOffset now,
        DateTimeOffset incomingExpiry)
    {
        if (requestGeneration != currentGeneration) return false;
        if (string.IsNullOrWhiteSpace(incomingSession)) return true; // empty session clears state
        if (incomingSession == stoppedSession) return false;
        return incomingExpiry > now;
    }
}
