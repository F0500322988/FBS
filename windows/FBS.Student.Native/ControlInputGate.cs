using System;
using System.Collections.Generic;

namespace FBS.Student.Native;

// Fail-closed policy: this module validates commands but never injects OS input.
// Execution will require a separate, explicitly enabled and tested native adapter.
public sealed class ControlInputGate
{
    private string? activeSession;
    private DateTimeOffset expiresAt;
    private long lastSequence;
    private readonly HashSet<string> closedSessions = new(StringComparer.Ordinal);
    private readonly HashSet<string> allowedTypes = new(StringComparer.Ordinal)
    {
        "pointer-preview", "key-preview"
    };

    public void Activate(string sessionId, DateTimeOffset expiry, bool studentApproved)
    {
        if (activeSession == sessionId && studentApproved && expiry > DateTimeOffset.UtcNow && !closedSessions.Contains(sessionId))
        {
            expiresAt = expiry;
            return;
        }
        Deactivate();
        if (!studentApproved || string.IsNullOrWhiteSpace(sessionId) || expiry <= DateTimeOffset.UtcNow || closedSessions.Contains(sessionId))
            return;
        activeSession = sessionId;
        expiresAt = expiry;
    }

    public bool Accept(string sessionId, long sequence, string commandType, DateTimeOffset now)
    {
        if (activeSession is null || !string.Equals(sessionId, activeSession, StringComparison.Ordinal)
            || now >= expiresAt || sequence <= lastSequence || !allowedTypes.Contains(commandType))
            return false;
        lastSequence = sequence;
        return true;
    }

    public void Deactivate()
    {
        if (activeSession is not null) closedSessions.Add(activeSession);
        activeSession = null;
        lastSequence = 0;
        expiresAt = DateTimeOffset.MinValue;
    }

    public bool InputEnabled => false;
    public bool IsSessionClosed(string sessionId) => closedSessions.Contains(sessionId);
}
