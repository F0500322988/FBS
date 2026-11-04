using System;
using System.Runtime.InteropServices;

namespace FBS.Student.Native;

/// <summary>
/// Windows-only native input adapter. Not wired to network messages or UI in M29.
/// An explicit opt-in from a later verified session controller is required.
/// </summary>
internal sealed class WindowsInputAdapter
{
    private bool enabled;
    public bool Enabled => enabled;
    public void Disable() => enabled = false;

    // Deliberately unavailable in M30: the native execution path has not passed
    // end-to-end Windows verification. This method cannot turn on injection.
    internal void EnableForVerifiedSession(bool explicitlyEnabledByOperator)
        => enabled = false;

    public bool MovePointer(int x, int y)
    {
        if (!enabled) return false;
        var bounds = System.Windows.Forms.SystemInformation.VirtualScreen;
        if (x < bounds.Left || y < bounds.Top || x >= bounds.Right || y >= bounds.Bottom)
            return false;
        var input = new INPUT { type = INPUT_MOUSE, union = new InputUnion {
            mi = new MOUSEINPUT { dx = (int)Math.Round((x - bounds.Left) * 65535.0 / Math.Max(1, bounds.Width - 1)),
                                  dy = (int)Math.Round((y - bounds.Top) * 65535.0 / Math.Max(1, bounds.Height - 1)),
                                  dwFlags = MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK }
        }};
        return SendInput(1, new[] { input }, Marshal.SizeOf<INPUT>()) == 1;
    }

    public bool TapLetter(char letter)
    {
        if (!enabled || !char.IsAsciiLetterOrDigit(letter)) return false;
        // Unicode key injection: no arbitrary shortcuts, modifiers or system keys.
        var down = new INPUT { type = INPUT_KEYBOARD, union = new InputUnion {
            ki = new KEYBDINPUT { wScan = letter, dwFlags = KEYEVENTF_UNICODE }
        }};
        var up = new INPUT { type = INPUT_KEYBOARD, union = new InputUnion {
            ki = new KEYBDINPUT { wScan = letter, dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP }
        }};
        return SendInput(2, new[] { down, up }, Marshal.SizeOf<INPUT>()) == 2;
    }

    private const uint INPUT_MOUSE = 0, INPUT_KEYBOARD = 1;
    private const uint MOUSEEVENTF_MOVE = 0x0001, MOUSEEVENTF_ABSOLUTE = 0x8000,
        MOUSEEVENTF_VIRTUALDESK = 0x4000, KEYEVENTF_UNICODE = 0x0004, KEYEVENTF_KEYUP = 0x0002;

    [StructLayout(LayoutKind.Sequential)] private struct INPUT
    {
        public uint type;
        public InputUnion union;
    }
    [StructLayout(LayoutKind.Explicit)] private struct InputUnion
    {
        [FieldOffset(0)] public MOUSEINPUT mi;
        [FieldOffset(0)] public KEYBDINPUT ki;
    }
    [StructLayout(LayoutKind.Sequential)] private struct MOUSEINPUT
    {
        public int dx, dy;
        public uint mouseData, dwFlags, time;
        public IntPtr dwExtraInfo;
    }
    [StructLayout(LayoutKind.Sequential)] private struct KEYBDINPUT
    {
        public ushort wVk, wScan;
        public uint dwFlags, time;
        public IntPtr dwExtraInfo;
    }
    [DllImport("user32.dll", SetLastError = true)]
    private static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);
}
