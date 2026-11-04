using System;
using System.Collections.Generic;

namespace FBS.Student.Native;

/// <summary>
/// M130: fail-closed stop ledger. Every locally stopped session stays revoked for
/// this agent process lifetime, even after a different session is stopped.
/// A bounded ledger refuses new sessions when exhausted rather than evicting a
/// tombstone and accidentally permitting an old session to reappear.
/// UI-thread-owned; do not access concurrently from worker threads.
/// </summary>
public sealed class StopRaceGuard
{
    private const int MaxStoppedSessions = 4096;
    private readonly HashSet<string> stoppedSessions = new(StringComparer.Ordinal);
    private long generation;
    private bool exhausted;

    public long Generation => generation;
    public bool IsExhausted => exhausted;

    public void Stop(string? sessionId)
    {
        if (string.IsNullOrWhiteSpace(sessionId)) return;
        if (stoppedSessions.Count >= MaxStoppedSessions && !stoppedSessions.Contains(sessionId))
            exhausted = true;
        else
            stoppedSessions.Add(sessionId);
        // Invalidate every in-flight poll, including repeated stop notifications.
        generation++;
    }

    public bool MayApply(string? sessionId, long requestGeneration, DateTimeOffset expiry, DateTimeOffset now)
        => !exhausted && !string.IsNullOrWhiteSpace(sessionId) &&
           !stoppedSessions.Contains(sessionId) && requestGeneration == generation && now < expiry;

    public bool WasStopped(string? sessionId)
        => exhausted || (!string.IsNullOrWhiteSpace(sessionId) && stoppedSessions.Contains(sessionId));
}
