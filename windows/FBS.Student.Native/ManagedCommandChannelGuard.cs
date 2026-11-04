using System;
using System.Text.Json;

namespace FBS.Student.Native;

/// <summary>
/// M118: local-only command-channel preflight. It never grants native input privileges.
/// The caller must independently validate the authenticated agent and teacher session.
/// </summary>
public sealed class ManagedCommandChannelGuard
{
    private string? sessionId;
    private long lastSequence;
    private DateTimeOffset expiry;
    private bool revoked;

    public bool Arm(string id, DateTimeOffset expires, DateTimeOffset now,
        bool enrolled, bool localAgentAuthenticated, bool indicatorVisible, bool studentStopped)
    {
        Revoke();
        if (string.IsNullOrWhiteSpace(id) || expires <= now ||
            expires - now > TimeSpan.FromMinutes(2) || !enrolled ||
            !localAgentAuthenticated || !indicatorVisible || studentStopped) return false;
        sessionId = id;
        expiry = expires;
        revoked = false;
        return true;
    }

    public bool AcceptPreview(JsonElement command, string id, DateTimeOffset now,
        bool agentConnected, bool indicatorVisible, bool studentStopped)
    {
        if (!agentConnected || !indicatorVisible || studentStopped || now >= expiry)
        {
            Revoke();
            return false;
        }
        if (revoked || sessionId is null || !string.Equals(sessionId, id, StringComparison.Ordinal) ||
            !PreviewPayloadPolicy.Valid(command, id, now) ||
            !command.TryGetProperty("sequence", out var seq) || !seq.TryGetInt64(out var number) ||
            number <= lastSequence) return false;
        lastSequence = number;
        return true;
    }

    public void Revoke()
    {
        sessionId = null;
        expiry = DateTimeOffset.MinValue;
        lastSequence = 0;
        revoked = true;
    }

    public bool NativeInputEnabled => false;
    public bool IsArmed => !revoked && sessionId is not null;
}
