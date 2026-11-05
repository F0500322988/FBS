using System.Diagnostics;
using System.Net.Http;
using System.Text;
using System.Text.Json;
namespace FBS.Student.Native;
internal sealed class AssistanceController : IDisposable
{
    private readonly AssistanceCommandGate gate = new();
    private readonly HttpClient client = new(new HttpClientHandler { UseProxy = false }) { Timeout = TimeSpan.FromSeconds(2) };
    private readonly System.Windows.Forms.Timer timer = new() { Interval = 300 };
    private ConsentForm? form; private bool busy, disposed;
    private static double Now => Stopwatch.GetTimestamp() * 1000d / Stopwatch.Frequency;
    public AssistanceController(string token) { client.DefaultRequestHeaders.Add("X-FBS-Local-Token", token); timer.Tick += async (_, _) => { if (gate.Session is not null && (!gate.IsLive(Now) || gate.LocallyApproved && form?.Active == true && !form.IndicatorVisible)) Stop(); if (!busy && !disposed) await Poll(); }; timer.Start(); }
    private async Task<bool> Post(object value) { try { using var body = new StringContent(JsonSerializer.Serialize(value), Encoding.UTF8, "application/json"); using var response = await client.PostAsync("http://127.0.0.1:4190/assist/local", body); return response.IsSuccessStatusCode; } catch { return false; } }
    private void Stop() { var id = gate.Session; gate.Stop(); form?.End(); form = null; if (id is not null) _ = Post(new { action = "stop", sessionId = id }); }
    private async Task Approve(string id)
    {
        if (busy || gate.Session != id || !AssistanceInput.DesktopAvailable()) return; busy = true;
        try { if (!gate.Approve(id, Now) || !await Post(new { action = "approve", sessionId = id })) { Stop(); return; } form?.ActiveMode(); }
        finally { busy = false; }
    }
    private async Task Poll()
    {
        busy = true;
        try
        {
            using var doc = JsonDocument.Parse(await client.GetStringAsync("http://127.0.0.1:4190/assist/local")); if (disposed) return;
            var root = doc.RootElement; bool pinned = root.GetProperty("supported").GetBoolean(), sharing = root.GetProperty("sharingFresh").GetBoolean(); var s = root.GetProperty("session");
            if (s.ValueKind == JsonValueKind.Null) { Stop(); return; }
            var id = s.GetProperty("sessionId").GetString()!; var state = s.GetProperty("status").GetString()!; bool local = s.GetProperty("locallyApproved").GetBoolean();
            if (gate.Session is not null && gate.Session != id) Stop();
            if (!gate.Observe(id, state, s.GetProperty("remainingMs").GetInt32(), pinned, sharing, local, Now)) { _ = Post(new { action = "stop", sessionId = id }); Stop(); return; }
            if (form is null)
            {
                var teacher = root.GetProperty("teacher"); var host = teacher.GetProperty("host").GetString(); var pin = teacher.GetProperty("fingerprint").GetString();
                form = new ConsentForm(host + "\nSHA256: " + pin, () => { _ = Approve(id); }, () => { if (gate.Session == id) Stop(); }); form.Show();
            }
            form.AllowApproval(sharing && AssistanceInput.DesktopAvailable());
            if (state != "active") return;
            if (!gate.LocallyApproved || !AssistanceInput.DesktopAvailable()) { Stop(); return; }
            form.ActiveMode();
            if (!form.IndicatorVisible) { Stop(); return; }
            foreach (var c in s.GetProperty("commands").EnumerateArray())
            {
                long seq = c.GetProperty("sequence").GetInt64(); bool accepted = gate.Accept(id, seq, true, sharing, AssistanceInput.DesktopAvailable() && AssistanceInput.OtherApplicationFocused(), Now), submitted = false;
                if (accepted) { var type = c.GetProperty("type").GetString(); if (type == "move") submitted = AssistanceInput.Move(c.GetProperty("dx").GetInt32(), c.GetProperty("dy").GetInt32()); else if (type == "text") submitted = AssistanceInput.Text(c.GetProperty("text").GetString()!); }
                _ = Post(new { action = "receipt", sessionId = id, sequence = seq, state = submitted ? "submitted" : "rejected" });
                if (!submitted) { Stop(); break; }
            }
        }
        catch { if (!disposed) Stop(); }
        finally { busy = false; }
    }
    public void Dispose() { if (disposed) return; disposed = true; timer.Stop(); timer.Dispose(); Stop(); client.Dispose(); }
    private sealed class ConsentForm : Form
    {
        private readonly Button approve = new() { Text = "أوافق على المساعدة المحدودة", Dock = DockStyle.Bottom, Height = 45 };
        private readonly Label label = new() { Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleCenter };
        private bool ending, active; private readonly Action stop;
        private readonly Button end = new() { Text = "رفض / إيقاف المساعدة", Dock = DockStyle.Bottom, Height = 45 };
        public bool Active => active;
        public bool IndicatorVisible => active && Visible && WindowState == FormWindowState.Normal && end.Visible && Screen.AllScreens.Any(s => s.WorkingArea.Contains(end.RectangleToScreen(end.ClientRectangle)));
        protected override bool ShowWithoutActivation => active;
        public ConsentForm(string teacher, Action consent, Action stop)
        {
            this.stop = stop; Text = "FBS Classroom — طلب مساعدة محدود"; Size = new Size(520, 330); StartPosition = FormStartPosition.CenterScreen; TopMost = true; MinimizeBox = false; MaximizeBox = false; RightToLeft = RightToLeft.Yes; Font = new Font("Segoe UI", 11);
            label.Text = "المعلم يطلب تحريك المؤشر نسبيًا وكتابة نص عادي، دون نقر أو اختصارات.\nشارك الشاشة كاملة أولًا من تطبيق الطالب، ثم وافق واختر البرنامج الذي سيستقبل النص.\nيمكنك الإيقاف بأي وقت.\n" + teacher;
            end.Click += (_, _) => stop(); approve.Click += (_, _) => consent(); Controls.Add(label); Controls.Add(approve); Controls.Add(end);
            FormClosing += (_, e) => { if (!ending) { e.Cancel = true; BeginInvoke(stop); } };
        }
        public void AllowApproval(bool allowed) { approve.Enabled = allowed && !active; }
        public void ActiveMode() { if (active) return; active = true; approve.Visible = false; label.Text = "مساعدة محدودة نشطة — المؤشر والنص العادي فقط\nاختر البرنامج الذي سيستقبل النص؛ شارك الشاشة باستمرار.\nيمكنك إيقافها بالزر أدناه. تنتهي بعد دقيقتين أو عند انقطاع الاتصال."; Size = new Size(440, 200); Location = new Point(Screen.PrimaryScreen!.WorkingArea.Right - Width - 12, Screen.PrimaryScreen.WorkingArea.Bottom - Height - 12); }
        public void End() { ending = true; Close(); Dispose(); }
    }
}
