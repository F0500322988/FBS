using System.Runtime.InteropServices;
using System.Text;
namespace FBS.Student.Native;
internal static class AssistanceInput
{
    internal static bool DesktopAvailable()
    {
        if (GetForegroundWindow() == IntPtr.Zero) return false;
        var desktop = OpenInputDesktop(0, false, 1); if (desktop == IntPtr.Zero) return false;
        try { var name = new StringBuilder(128); return GetUserObjectInformation(desktop, 2, name, 256, out _) && name.ToString() == "Default"; }
        finally { CloseDesktop(desktop); }
    }
    internal static bool NeutralInputState() => !new[] { 1, 2, 4, 16, 17, 18, 91, 92 }.Any(k => GetAsyncKeyState(k) < 0);
    internal static bool OtherApplicationFocused() { GetWindowThreadProcessId(GetForegroundWindow(), out uint pid); return pid != 0 && pid != (uint)Environment.ProcessId; }
    internal static bool Move(int dx, int dy)
    {
        if (Math.Abs((long)dx) > 100 || Math.Abs((long)dy) > 100 || (dx == 0 && dy == 0) || !DesktopAvailable() || !NeutralInputState()) return false;
        var input = new Input { type = 0, data = new Data { mouse = new Mouse { dx = dx, dy = dy, flags = 1 } } };
        return SendInput(1, new[] { input }, Marshal.SizeOf<Input>()) == 1;
    }
    internal static bool Text(string text)
    {
        if (!AssistanceCommandGate.ValidText(text) || !DesktopAvailable() || !NeutralInputState()) return false;
        var inputs = new List<Input>();
        foreach (char c in text) { inputs.Add(new Input { type = 1, data = new Data { key = new Key { scan = c, flags = 4 } } }); inputs.Add(new Input { type = 1, data = new Data { key = new Key { scan = c, flags = 6 } } }); }
        return SendInput((uint)inputs.Count, inputs.ToArray(), Marshal.SizeOf<Input>()) == inputs.Count;
    }
    internal static bool Click(string button)
    {
        if (!DesktopAvailable() || !NeutralInputState() || button is not ("left" or "right" or "double")) return false;
        uint down = button == "right" ? 8u : 2u, up = button == "right" ? 16u : 4u;
        var inputs = Enumerable.Range(0, button == "double" ? 2 : 1).SelectMany(_ => new[] { new Input { data = new Data { mouse = new Mouse { flags = down } } }, new Input { data = new Data { mouse = new Mouse { flags = up } } } }).ToArray();
        bool ok = SendInput((uint)inputs.Length, inputs, Marshal.SizeOf<Input>()) == inputs.Length;
        if (!ok) SendInput(1, new[] { new Input { data = new Data { mouse = new Mouse { flags = up } } } }, Marshal.SizeOf<Input>());
        return ok;
    }
    internal static bool Drag(int dx, int dy)
    {
        if (Math.Abs((long)dx) > 500 || Math.Abs((long)dy) > 500 || (dx == 0 && dy == 0) || !DesktopAvailable() || !NeutralInputState()) return false;
        var inputs = new[] { new Input { data = new Data { mouse = new Mouse { flags = 2 } } }, new Input { data = new Data { mouse = new Mouse { dx = dx, dy = dy, flags = 1 } } }, new Input { data = new Data { mouse = new Mouse { flags = 4 } } } };
        bool ok = SendInput(3, inputs, Marshal.SizeOf<Input>()) == 3;
        if (!ok) SendInput(1, new[] { inputs[2] }, Marshal.SizeOf<Input>());
        return ok;
    }
    internal static bool Scroll(int steps)
    {
        if (steps == 0 || Math.Abs((long)steps) > 5 || !DesktopAvailable() || !NeutralInputState()) return false;
        return SendInput(1, new[] { new Input { data = new Data { mouse = new Mouse { flags = 0x800, mouseData = unchecked((uint)(steps * 120)) } } } }, Marshal.SizeOf<Input>()) == 1;
    }
    internal static ushort KeyCode(string key) => key switch {
        "Enter" => 13, "Tab" => 9, "Escape" => 27, "Backspace" => 8, "Delete" => 46, "Space" => 32,
        "ArrowLeft" => 37, "ArrowUp" => 38, "ArrowRight" => 39, "ArrowDown" => 40, "Home" => 36, "End" => 35, "PageUp" => 33, "PageDown" => 34,
        _ when key.Length == 1 && (key[0] is >= 'A' and <= 'Z' or >= '0' and <= '9') => key[0],
        _ when key.StartsWith("F") && int.TryParse(key[1..], out int f) && f >= 1 && f <= 12 => (ushort)(111 + f), _ => 0 };
    internal static bool PressKey(string key, string[] modifiers)
    {
        ushort code = KeyCode(key);
        if (code == 0 || modifiers.Length > 2 || modifiers.Distinct().Count() != modifiers.Length || modifiers.Any(m => m is not ("primary" or "shift" or "alt")) || !DesktopAvailable() || !NeutralInputState()) return false;
        var mods = modifiers.Select(m => (ushort)(m == "primary" ? 17 : m == "shift" ? 16 : 18)).ToArray();
        uint extended = code is >= 33 and <= 46 ? 1u : 0u;
        Input K(ushort c, uint flags) => new() { type = 1, data = new Data { key = new Key { code = c, flags = flags } } };
        var inputs = mods.Select(c => K(c, 0)).Concat(new[] { K(code, extended), K(code, extended | 2) }).Concat(mods.Reverse().Select(c => K(c, 2))).ToArray();
        bool ok = SendInput((uint)inputs.Length, inputs, Marshal.SizeOf<Input>()) == inputs.Length;
        if (!ok) { var release = new[] { K(code, extended | 2) }.Concat(mods.Reverse().Select(c => K(c, 2))).ToArray(); SendInput((uint)release.Length, release, Marshal.SizeOf<Input>()); }
        return ok;
    }
    // LockWorkStation is asynchronous. A successful return is a submitted request, not proof of a locked session.
    internal static bool RequestSystemLock() => DesktopAvailable() && LockWorkStation();
    [DllImport("user32.dll", SetLastError = true)] private static extern bool LockWorkStation();
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
