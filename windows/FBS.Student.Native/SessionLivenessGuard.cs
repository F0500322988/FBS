using System;

namespace FBS.Student.Native;

/// <summary>M124: fail-closed liveness check for preview sessions. Never enables native input.</summary>
public sealed class SessionLivenessGuard
{
    private string? sessionId;
    private bool stopped = true;
    private DateTimeOffset lastContact;
    private DateTimeOffset expiry;
    private readonly TimeSpan maxSilence = TimeSpan.FromSeconds(6);

    public void Start(string id, DateTimeOffset expires, DateTimeOffset now)
    {
        Stop();
        if (string.IsNullOrWhiteSpace(id) || expires <= now || expires - now > TimeSpan.FromMinutes(2)) return;
        sessionId = id;
        expiry = expires;
        lastContact = now;
        stopped = false;
    }

    public bool Heartbeat(string id, DateTimeOffset now)
    {
        if (!Allowed(id, now)) return false;
        lastContact = now;
        return true;
    }

    public bool Allowed(string id, DateTimeOffset now)
    {
        if (stopped || sessionId != id || now >= expiry || now < lastContact || now - lastContact > maxSilence)
        {
            Stop();
            return false;
        }
        return true;
    }

    public void Stop()
    {
        stopped = true;
        sessionId = null;
        expiry = DateTimeOffset.MinValue;
        lastContact = DateTimeOffset.MinValue;
    }

    public bool IsActive => !stopped;
}
