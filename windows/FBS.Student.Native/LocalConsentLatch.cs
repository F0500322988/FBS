using System;
using System.Collections.Generic;

namespace FBS.Student.Native;

// Consent is local, session-specific and fail-closed. A remote status alone cannot grant it.
public sealed class LocalConsentLatch
{
    private string? activeSession;
    private string? awaitingConfirmation;
    private string? approvedSession;
    private readonly HashSet<string> closed = new(StringComparer.Ordinal);

    public bool Observe(string sessionId)
    {
        if (string.IsNullOrWhiteSpace(sessionId) || closed.Contains(sessionId)) return false;
        if (activeSession != sessionId)
        {
            activeSession = sessionId;
            awaitingConfirmation = null;
            approvedSession = null;
        }
        return true;
    }

    public bool BeginApproval(string sessionId)
    {
        if (sessionId != activeSession || closed.Contains(sessionId)) return false;
        awaitingConfirmation = sessionId;
        approvedSession = null;
        return true;
    }

    public bool ConfirmApproval(string sessionId, bool requestSucceeded)
    {
        if (sessionId != activeSession || awaitingConfirmation != sessionId || closed.Contains(sessionId)) return false;
        awaitingConfirmation = null;
        if (!requestSucceeded) { Close(sessionId); return false; }
        approvedSession = sessionId;
        return true;
    }

    public bool CanPreview(string sessionId) => sessionId == activeSession &&
        approvedSession == sessionId && !closed.Contains(sessionId);

    public void Close(string sessionId)
    {
        if (string.IsNullOrWhiteSpace(sessionId)) return;
        closed.Add(sessionId);
        if (activeSession == sessionId) { activeSession = null; awaitingConfirmation = null; approvedSession = null; }
    }

    public void ResetActive()
    {
        if (activeSession is not null) Close(activeSession);
    }
}
