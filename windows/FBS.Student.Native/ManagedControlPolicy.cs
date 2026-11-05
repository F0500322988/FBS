using System;

namespace FBS.Student.Native;

/// <summary>
/// Local, managed-lab authorization foundation. A teacher message cannot enroll a device.
/// This class deliberately never calls SendInput or enables WindowsInputAdapter.
/// </summary>
public sealed class ManagedControlPolicy
{
    private readonly bool locallyProvisioned;
    private readonly string provisionedTeacherId;
    private string? session;
    private DateTimeOffset expires;
    private bool visibleIndicator;
    private bool studentStopped;

    public ManagedControlPolicy(bool locallyProvisioned, string provisionedTeacherId)
    {
        this.locallyProvisioned = locallyProvisioned;
        this.provisionedTeacherId = provisionedTeacherId ?? string.Empty;
    }

    public bool Start(string teacherId, string sessionId, DateTimeOffset now, TimeSpan lease,
        bool deviceEnrolled, bool studentIndicatorVisible)
    {
        Stop();
        if (studentStopped || !locallyProvisioned || !deviceEnrolled || !studentIndicatorVisible ||
            string.IsNullOrWhiteSpace(provisionedTeacherId) || teacherId != provisionedTeacherId ||
            string.IsNullOrWhiteSpace(sessionId) || lease <= TimeSpan.Zero || lease > TimeSpan.FromMinutes(2))
            return false;
        session = sessionId;
        expires = now.Add(lease);
        visibleIndicator = true;
        return true;
    }

    public bool CanRequestInput(string teacherId, string sessionId, DateTimeOffset now,
        bool studentIndicatorVisible, bool networkConnected)
    {
        if (!studentIndicatorVisible || !networkConnected) { Stop(); return false; }
        return !studentStopped && visibleIndicator && session == sessionId &&
            teacherId == provisionedTeacherId && now < expires;
    }

    public void Stop()
    {
        session = null;
        expires = DateTimeOffset.MinValue;
        visibleIndicator = false;
    }

    // Student-side emergency stop is sticky until a new local provisioning cycle.
    public void StudentEmergencyStop() { studentStopped = true; Stop(); }
    public bool StudentStopped => studentStopped;
    public bool IndicatorRequired => session is not null;
    public bool NativeInputEnabled => false; // remains disabled pending Windows field verification
}
