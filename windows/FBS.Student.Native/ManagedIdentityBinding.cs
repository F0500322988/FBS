using System;
using System.Text.Json;

namespace FBS.Student.Native;

/// <summary>
/// M119: fail-closed identity binding for a future authenticated command transport.
/// Identifiers are assertions, NOT cryptographic authentication. The transport must
/// verify a teacher signature and enrollment before invoking this policy.
/// </summary>
public sealed class ManagedIdentityBinding
{
    private string? teacherId;
    private string? deviceId;
    private string? sessionId;
    private bool revoked = true;

    public bool Bind(string teacher, string device, string session,
        bool teacherAuthenticated, bool deviceEnrolled, bool studentIndicatorVisible,
        bool studentStopped)
    {
        Revoke();
        if (!teacherAuthenticated || !deviceEnrolled || !studentIndicatorVisible || studentStopped ||
            string.IsNullOrWhiteSpace(teacher) || string.IsNullOrWhiteSpace(device) ||
            string.IsNullOrWhiteSpace(session)) return false;
        teacherId = teacher;
        deviceId = device;
        sessionId = session;
        revoked = false;
        return true;
    }

    public bool Matches(JsonElement command, bool authenticatedTransport, bool indicatorVisible,
        bool studentStopped)
    {
        if (!authenticatedTransport || !indicatorVisible || studentStopped)
        {
            Revoke();
            return false;
        }
        if (revoked || !TryString(command, "teacherId", out var teacher) ||
            !TryString(command, "deviceId", out var device) ||
            !TryString(command, "sessionId", out var session)) return false;
        return string.Equals(teacherId, teacher, StringComparison.Ordinal) &&
            string.Equals(deviceId, device, StringComparison.Ordinal) &&
            string.Equals(sessionId, session, StringComparison.Ordinal);
    }

    private static bool TryString(JsonElement value, string property, out string? result)
    {
        result = null;
        if (value.ValueKind != JsonValueKind.Object ||
            !value.TryGetProperty(property, out var field) || field.ValueKind != JsonValueKind.String)
            return false;
        result = field.GetString();
        return !string.IsNullOrWhiteSpace(result);
    }

    public void Revoke()
    {
        revoked = true;
        teacherId = deviceId = sessionId = null;
    }

    public bool IsBound => !revoked;
    public bool NativeInputEnabled => false;
}
