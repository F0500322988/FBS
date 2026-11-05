using System.Net.Http;
using System.Text.Json;

namespace FBS.Student.Native;

// Viewer only. Never captures student screens or sends input to the operating system.
internal sealed class TeacherBroadcastForm : Form
{
    private readonly HttpClient client = new(new HttpClientHandler { UseProxy = false }) { Timeout = TimeSpan.FromSeconds(2) };
    private readonly System.Windows.Forms.Timer timer = new() { Interval = 1000 };
    private readonly PictureBox picture = new() { Dock = DockStyle.Fill, SizeMode = PictureBoxSizeMode.Zoom, BackColor = Color.FromArgb(15, 30, 53) };
    private readonly Label state = new() { Dock = DockStyle.Bottom, Height = 40, Text = "انتظار شاشة المعلم...", TextAlign = ContentAlignment.MiddleCenter };
    private readonly Button fullscreen = new() { Dock = DockStyle.Bottom, Height = 36, Text = "تكبير نافذة العرض" };
    private bool busy, automatic;
    private string? sessionId;
    private long sequence;
    private DateTimeOffset lastFrameAt = DateTimeOffset.MinValue;
    public TeacherBroadcastForm(string token)
    {
        Text = "FBS Classroom — عرض شاشة المعلم";
        RightToLeft = RightToLeft.Yes; RightToLeftLayout = true;
        FormBorderStyle = FormBorderStyle.None; StartPosition = FormStartPosition.Manual; Bounds = Screen.PrimaryScreen!.Bounds; TopMost = true; ShowInTaskbar = false;
        Font = new Font("Segoe UI", 11);
        Controls.Add(picture);
        FormClosing += (_, e) => { if (!automatic && !Disposing && DateTimeOffset.UtcNow - lastFrameAt < TimeSpan.FromSeconds(4)) e.Cancel = true; };
        client.DefaultRequestHeaders.Add("X-FBS-Local-Token", token);
        fullscreen.Click += (_, _) => WindowState = WindowState == FormWindowState.Maximized ? FormWindowState.Normal : FormWindowState.Maximized;
        timer.Tick += async (_, _) => await RefreshFrame();
        Shown += async (_, _) => { timer.Start(); await RefreshFrame(); };
        FormClosed += (_, _) => { timer.Stop(); timer.Dispose(); client.Dispose(); ClearImage(); };
    }
    private void ClearImage()
    {
        var previous = picture.Image; picture.Image = null; previous?.Dispose();
    }
    private async Task RefreshFrame()
    {
        if (IsDisposed) return;
        if (DateTimeOffset.UtcNow - lastFrameAt > TimeSpan.FromSeconds(4))
        { ClearImage(); if (sessionId is not null) { automatic = true; Close(); return; } }
        if (busy) return; busy = true;
        try
        {
            var raw = await client.GetStringAsync("http://127.0.0.1:4190/broadcast/local");
            if (IsDisposed) return;
            using var doc = JsonDocument.Parse(raw);
            var frame = doc.RootElement.GetProperty("broadcast");
            if (frame.ValueKind == JsonValueKind.Null)
            { ClearImage(); automatic = true; Close(); return; }
            var incomingSession = frame.GetProperty("sessionId").GetString();
            var incomingSequence = frame.GetProperty("sequence").GetInt64();
            if (incomingSession == sessionId && incomingSequence <= sequence) return;
            var jpeg = frame.GetProperty("jpeg").GetString();
            if (jpeg is null || jpeg.Length > 170000 || !jpeg.StartsWith("data:image/jpeg;base64,", StringComparison.Ordinal)) throw new InvalidDataException("Invalid frame");
            var bytes = Convert.FromBase64String(jpeg[23..]);
            using var stream = new MemoryStream(bytes);
            using var decoded = Image.FromStream(stream);
            if (decoded.Width > 1280 || decoded.Height > 720) throw new InvalidDataException("Frame is too large");
            var image = new Bitmap(decoded);
            ClearImage(); picture.Image = image;
            sessionId = incomingSession; sequence = incomingSequence; lastFrameAt = DateTimeOffset.UtcNow;
            state.Text = "شاشة المعلم — عرض تلقائي بملء الشاشة";
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException or ObjectDisposedException or FormatException or InvalidDataException or ArgumentException or OutOfMemoryException)
        { if (!IsDisposed) { ClearImage(); state.Text = "تعذر تحديث شاشة المعلم؛ أُخفيت الصورة السابقة"; } }
        finally { busy = false; }
    }
}
