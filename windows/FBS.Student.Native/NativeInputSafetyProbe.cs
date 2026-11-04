using System;

namespace FBS.Student.Native;

/// <summary>
/// M128: fail-closed startup probe. Never enables native input or calls SendInput.
/// This verifies the adapter refuses pointer/keyboard actions while disabled.
/// It is NOT an end-to-end remote control test.
/// </summary>
internal static class NativeInputSafetyProbe
{
    internal static bool VerifyDisabled(WindowsInputAdapter adapter)
    {
        if (adapter is null) return false;
        adapter.Disable();
        return !adapter.Enabled &&
               !adapter.MovePointer(0, 0) &&
               !adapter.TapLetter('A') &&
               !adapter.TapLetter('1');
    }
}
