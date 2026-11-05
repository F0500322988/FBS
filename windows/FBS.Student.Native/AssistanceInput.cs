using System.Runtime.InteropServices;
using System.Text;
namespace FBS.Student.Native;
internal static class AssistanceInput
{
    internal static bool DesktopAvailable()
    {
        if (GetForegroundWindow() == IntPtr.Zero || new[] { 1, 2, 4, 16, 17, 18, 91, 92 }.Any(k => GetAsyncKeyState(k) < 0)) return false;
        var desktop = OpenInputDesktop(0, false, 1); if (desktop == IntPtr.Zero) return false;
        try { var name = new StringBuilder(128); return GetUserObjectInformation(desktop, 2, name, 256, out _) && name.ToString() == "Default"; }
        finally { CloseDesktop(desktop); }
    }
    internal static bool OtherApplicationFocused() { GetWindowThreadProcessId(GetForegroundWindow(), out uint pid); return pid != 0 && pid != (uint)Environment.ProcessId; }
    internal static bool Move(int dx, int dy)
    {
        if (Math.Abs((long)dx) > 100 || Math.Abs((long)dy) > 100 || (dx == 0 && dy == 0) || !DesktopAvailable()) return false;
        var input = new Input { type = 0, data = new Data { mouse = new Mouse { dx = dx, dy = dy, flags = 1 } } };
        return SendInput(1, new[] { input }, Marshal.SizeOf<Input>()) == 1;
    }
    internal static bool Text(string text)
    {
        if (!AssistanceCommandGate.ValidText(text) || !DesktopAvailable()) return false;
        var inputs = new List<Input>();
        foreach (char c in text) { inputs.Add(new Input { type = 1, data = new Data { key = new Key { scan = c, flags = 4 } } }); inputs.Add(new Input { type = 1, data = new Data { key = new Key { scan = c, flags = 6 } } }); }
        return SendInput((uint)inputs.Count, inputs.ToArray(), Marshal.SizeOf<Input>()) == inputs.Count;
    }
    [StructLayout(LayoutKind.Sequential)] private struct Input { public uint type; public Data data; }
    [StructLayout(LayoutKind.Explicit)] private struct Data { [FieldOffset(0)] public Mouse mouse; [FieldOffset(0)] public Key key; }
    [StructLayout(LayoutKind.Sequential)] private struct Mouse { public int dx, dy; public uint mouseData, flags, time; public IntPtr extra; }
    [StructLayout(LayoutKind.Sequential)] private struct Key { public ushort code, scan; public uint flags, time; public IntPtr extra; }
    [DllImport("user32.dll", SetLastError = true)] private static extern uint SendInput(uint count, Input[] inputs, int size);
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr window, out uint process);
    [DllImport("user32.dll")] private static extern short GetAsyncKeyState(int key);
    [DllImport("user32.dll", SetLastError = true)] private static extern IntPtr OpenInputDesktop(uint flags, bool inherit, uint access);
    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)] private static extern bool GetUserObjectInformation(IntPtr handle, int index, StringBuilder info, uint length, out uint needed);
    [DllImport("user32.dll")] private static extern bool CloseDesktop(IntPtr desktop);
}
