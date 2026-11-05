using System.Diagnostics;
using System.Net.Http;
using System.Text;
using System.Text.Json;
namespace FBS.Student.Native;
internal sealed class ScreenPauseController : IDisposable
{
    private readonly HttpClient client = new(new HttpClientHandler { UseProxy = false }) { Timeout = TimeSpan.FromSeconds(2) };
    private readonly System.Windows.Forms.Timer timer = new() { Interval = 500 };
    private readonly List<PauseForm> windows = new();
    private readonly HashSet<string> dismissed = new();
    private bool busy, disposed;
    private string? session;
    private long deadline;
    public ScreenPauseController(string token)
    {
        client.DefaultRequestHeaders.Add("X-FBS-Local-Token", token);
        timer.Tick += async (_, _) => { if (Stopwatch.GetTimestamp() >= deadline) HideAll(); if (!busy && !disposed) await Poll(); };
        timer.Start();
    }
    private void HideAll() { session = null; deadline = 0; foreach (var form in windows) form.End(); windows.Clear(); }
    private async Task Receipt(string id, string state)
    {
        try { using var body = new StringContent(JsonSerializer.Serialize(new { sessionId = id, state }), Encoding.UTF8, "application/json"); using var response = await client.PostAsync("http://127.0.0.1:4190/pause/local", body); }
        catch (Exception ex) when (ex is HttpRequestException or OperationCanceledException or ObjectDisposedException) { }
    }
    private void Release(string expected)
    {
        var id = session; if (id is null || id != expected) return;
        dismissed.Add(id); if (dismissed.Count > 100) dismissed.Remove(dismissed.First(x => x != id));
        HideAll(); _ = Receipt(id, "released");
    }
    private async Task Poll()
    {
        busy = true;
        try
        {
            using var doc = JsonDocument.Parse(await client.GetStringAsync("http://127.0.0.1:4190/pause/local")); if (disposed) return;
            var pause = doc.RootElement.GetProperty("pause"); if (pause.ValueKind == JsonValueKind.Null) { HideAll(); return; }
            var id = pause.GetProperty("sessionId").GetString(); var remaining = pause.GetProperty("remainingMs").GetInt32();
            if (!Guid.TryParseExact(id, "D", out _) || remaining < 1 || remaining > 10000 || dismissed.Contains(id!)) { HideAll(); return; }
            var changed = session != id;
            if (changed) HideAll(); session = id; deadline = Stopwatch.GetTimestamp() + (long)(remaining / 1000d * Stopwatch.Frequency);
            if (changed)
            {
                foreach (var screen in Screen.AllScreens.Take(16)) { var form = new PauseForm(screen.Bounds, () => Release(id!)); windows.Add(form); form.Show(); }
                if (windows.Count > 0) { windows[0].Activate(); _ = Receipt(id!, "displayed"); }
            }
        }
        catch (Exception ex) when (ex is HttpRequestException or OperationCanceledException or ObjectDisposedException or JsonException or InvalidOperationException or KeyNotFoundException or FormatException) { if (!disposed) HideAll(); }
        finally { busy = false; }
    }
    public void Dispose() { if (disposed) return; disposed = true; timer.Stop(); timer.Dispose(); HideAll(); client.Dispose(); }
    private sealed class PauseForm : Form
    {
        private readonly Action release; private bool automatic;
        public PauseForm(Rectangle bounds, Action release)
        {
            this.release = release; Text = "FBS Classroom — حجب عرض مؤقت"; FormBorderStyle = FormBorderStyle.None; StartPosition = FormStartPosition.Manual; Bounds = bounds; TopMost = true; ShowInTaskbar = false; BackColor = Color.FromArgb(15, 40, 85); ForeColor = Color.White; RightToLeft = RightToLeft.Yes; KeyPreview = true;
            var text = new Label { Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleCenter, Font = new Font("Segoe UI", 24), Text = "🎓 FBS Classroom\n\nيرجى الانتباه إلى المعلم\n\nحجب عرض مؤقت — ينتهي عند إيقاف المعلم أو انقطاع الاتصال\nEsc أو الزر أدناه لإنهائه محليًا\nهذا ليس قفلًا لحساب Windows" };
            var exit = new Button { Dock = DockStyle.Bottom, Height = 70, Font = new Font("Segoe UI", 16), Text = "إنهاء حجب العرض محليًا", BackColor = Color.White, ForeColor = Color.Black }; exit.Click += (_, _) => release(); Controls.Add(text); Controls.Add(exit);
            FormClosing += (_, e) => { if (!automatic) { e.Cancel = true; BeginInvoke(release); } };
        }
        protected override bool ProcessCmdKey(ref Message msg, Keys keyData) { if (keyData == Keys.Escape) { release(); return true; } return base.ProcessCmdKey(ref msg, keyData); }
        public void End() { automatic = true; Close(); Dispose(); }
    }
}
