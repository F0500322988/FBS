using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net;
using System.Reflection;
using System.Text;
using System.Text.Json;
using FBS.Student.Native;
internal static class Program
{
    [STAThread] private static void Main()
    {
        Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
        using var host = new LocalFixture(); using var runner = new Form { ShowInTaskbar = false, Opacity = 0, Size = new Size(50, 50) };
        using var controller = new ScreenPauseController(LocalFixture.Token);
        using var timer = new System.Windows.Forms.Timer { Interval = 100 };
        var watch = Stopwatch.StartNew(); int phase = 0, passed = 0; long since = 0;
        var id = Guid.NewGuid().ToString(); host.Set(id, 2000);
        void Check(bool ok, string label) { if (!ok) throw new Exception(label); passed++; Console.WriteLine("PASS: " + label); }
        Form[] Overlays() => Application.OpenForms.Cast<Form>().Where(f => f.GetType().Name == "PauseForm").ToArray();
        timer.Tick += (_, _) =>
        {
            try
            {
                if (watch.ElapsedMilliseconds > 25000) throw new TimeoutException("screen pause CI timed out at phase " + phase);
                var windows = Overlays();
                if (phase == 0 && windows.Length > 0)
                {
                    Check(windows.Length == Math.Min(16, Screen.AllScreens.Length), "overlay created for each CI screen");
                    Check(windows.All(w => w.Visible && w.TopMost && w.FormBorderStyle == FormBorderStyle.None && Screen.AllScreens.Any(s => s.Bounds == w.Bounds)), "visible overlay bounds and window properties");
                    var command = windows[0].GetType().GetMethod("ProcessCmdKey", BindingFlags.Instance | BindingFlags.NonPublic)!;
                    command.Invoke(windows[0], new object[] { new Message(), Keys.Escape });
                    Check(Overlays().Length == 0, "owned Escape handler closes immediately"); since = watch.ElapsedMilliseconds; phase = 1;
                }
                else if (phase == 1 && watch.ElapsedMilliseconds - since > 2200)
                {
                    Check(host.Receipts.Contains("released"), "local release receipt sent");
                    Check(windows.Length == 0, "repeated old local response cannot reopen dismissed session");
                    host.Set(Guid.NewGuid().ToString(), 1200); phase = 2;
                }
                else if (phase == 2 && windows.Length > 0) { host.Stall = true; since = watch.ElapsedMilliseconds; phase = 3; }
                else if (phase == 3 && windows.Length == 0)
                {
                    Check(watch.ElapsedMilliseconds - since < 3000, "local expiry closes while HTTP is stalled");
                    host.Set(null, 0); host.Stall = false; since = watch.ElapsedMilliseconds; phase = 4;
                }
                else if (phase == 4 && watch.ElapsedMilliseconds - since > 2300) { host.Set(Guid.NewGuid().ToString(), 10000); phase = 5; }
                else if (phase == 5 && windows.Length > 0)
                {
                    controller.Dispose(); Check(Overlays().Length == 0, "controller disposal closes all owned overlays");
                    timer.Stop(); Console.WriteLine(JsonSerializer.Serialize(new { stage = "M180", winFormsCiChecksPassed = passed, actualStudentAppTested = false, physicalKeyboardTested = false, installerExecuted = false })); runner.Close();
                }
            }
            catch (Exception ex) { timer.Stop(); controller.Dispose(); Console.Error.WriteLine("FAIL: " + ex.GetType().Name + " " + ex.Message + " " + ex.InnerException?.GetType().Name + " " + ex.InnerException?.Message); Environment.ExitCode = 1; runner.Close(); }
        };
        runner.Shown += (_, _) => timer.Start(); Application.Run(runner);
    }
    private sealed class LocalFixture : IDisposable
    {
        internal const string Token = "m178-disposable-loopback-fixture-token";
        private readonly HttpListener listener = new(); private readonly object gate = new(); private object? pause;
        internal volatile bool Stall; internal ConcurrentBag<string> Receipts = new();
        internal void Set(string? id, int remaining) { lock (gate) pause = id is null ? null : new { sessionId = id, remainingMs = remaining }; }
        internal LocalFixture() { listener.Prefixes.Add("http://127.0.0.1:4190/"); listener.Start(); _ = Run(); }
        private async Task Run()
        {
            try { while (listener.IsListening) { var context = await listener.GetContextAsync(); _ = Serve(context); } }
            catch (Exception ex) when (ex is HttpListenerException or ObjectDisposedException) { }
        }
        private async Task Serve(HttpListenerContext context)
        {
            try
            {
                if (context.Request.Headers["X-FBS-Local-Token"] != Token) { context.Response.StatusCode = 403; return; }
                string json;
                if (context.Request.HttpMethod == "POST") { using var doc = await JsonDocument.ParseAsync(context.Request.InputStream); Receipts.Add(doc.RootElement.GetProperty("state").GetString()!); json = "{\"confirmed\":true}"; }
                else { if (Stall) await Task.Delay(8000); lock (gate) json = JsonSerializer.Serialize(new { pause }); }
                var data = Encoding.UTF8.GetBytes(json); context.Response.ContentType = "application/json"; context.Response.ContentLength64 = data.Length; await context.Response.OutputStream.WriteAsync(data);
            }
            catch (Exception ex) when (ex is HttpListenerException or IOException or ObjectDisposedException) { }
            finally { context.Response.Close(); }
        }
        public void Dispose() { listener.Stop(); listener.Close(); }
    }
}
