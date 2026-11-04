using System;

namespace FBS.Student.Native;

/// <summary>
/// M144: fail-closed, one-shot local enrollment UI activation.
/// No command-line flags, environment variables, HTTP requests or default credentials
/// can activate this gate. A trusted in-process host must supply an already
/// authenticated, persistent ManagedEnrollmentCommandService explicitly.
/// This gate is not a substitute for administrator authentication or secure key storage.
/// </summary>
public sealed class EnrollmentStartupGate
{
    private readonly object sync = new();
    private bool active;
    private bool closed;

    public bool IsActive
    {
        get { lock (sync) return active && !closed; }
    }

    public bool TryActivate(ManagedEnrollmentCommandService? service)
    {
        lock (sync)
        {
            if (service is null || active || closed) return false;
            active = true;
            return true;
        }
    }

    public void Close()
    {
        lock (sync)
        {
            active = false;
            closed = true;
        }
    }
}
