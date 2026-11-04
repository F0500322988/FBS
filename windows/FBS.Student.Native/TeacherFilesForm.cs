using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
namespace FBS.Student.Native;
internal sealed class TeacherFilesForm : Form
{
    private readonly HttpClient client = new(new HttpClientHandler { UseProxy = false }) { Timeout = TimeSpan.FromSeconds(15) };
    private readonly System.Windows.Forms.Timer timer = new() { Interval = 2000 };
    private readonly ListBox list = new() { Dock = DockStyle.Fill };
    private readonly Button save = new() { Dock = DockStyle.Bottom, Height = 45, Text = "حفظ الملف المحدد...", Enabled = false };
    private readonly Label state = new() { Dock = DockStyle.Bottom, Height = 55, Text = "الملفات لا تُفتح تلقائيًا؛ اختر مكان الحفظ بنفسك" };
    private bool busy;
    private readonly System.Threading.CancellationTokenSource lifetime = new();
    private sealed record Item(string Id, string Name, int Size, string Hash) { public override string ToString() => Name + " — " + Math.Ceiling(Size / 1024d) + " KB"; }
    public TeacherFilesForm(string token)
    {
        Text = "FBS Classroom — ملفات المعلم"; Size = new Size(600, 360); MinimumSize = new Size(400, 280); RightToLeft = RightToLeft.Yes; RightToLeftLayout = true; Font = new Font("Segoe UI", 11); StartPosition = FormStartPosition.CenterParent;
        client.DefaultRequestHeaders.Add("X-FBS-Local-Token", token); Controls.Add(list); Controls.Add(save); Controls.Add(state);
        list.SelectedIndexChanged += (_, _) => save.Enabled = !busy && list.SelectedItem is Item;
        save.Click += async (_, _) => await SaveFile(); timer.Tick += async (_, _) => await RefreshFiles();
        Shown += async (_, _) => { timer.Start(); await RefreshFiles(); }; FormClosed += (_, _) => { lifetime.Cancel(); timer.Stop(); timer.Dispose(); client.Dispose(); };
    }
    private async Task RefreshFiles()
    {
        if (busy || IsDisposed) return; busy = true;
        try
        {
            var raw = await client.GetStringAsync("http://127.0.0.1:4190/files/local"); using var doc = JsonDocument.Parse(raw); if (IsDisposed) return;
            var selected = (list.SelectedItem as Item)?.Id; list.Items.Clear();
            foreach (var f in doc.RootElement.GetProperty("files").EnumerateArray()) list.Items.Add(new Item(f.GetProperty("id").GetString()!, f.GetProperty("name").GetString()!, f.GetProperty("size").GetInt32(), f.GetProperty("sha256").GetString()!));
            for (var i = 0; i < list.Items.Count; i++) if (((Item)list.Items[i]).Id == selected) list.SelectedIndex = i;
            if (list.SelectedIndex < 0 && list.Items.Count > 0) list.SelectedIndex = 0;
        }
        catch (Exception ex) when (ex is HttpRequestException or OperationCanceledException or JsonException or ObjectDisposedException) { if (!IsDisposed) { list.Items.Clear(); state.Text = "تعذر تحديث الملفات؛ أُخفيت القائمة السابقة"; } }
        finally { busy = false; if (!IsDisposed) save.Enabled = list.SelectedItem is Item; }
    }
    private async Task SaveFile()
    {
        if (busy || list.SelectedItem is not Item file) return;
        using var dialog = new SaveFileDialog { FileName = file.Name, AddExtension = false, OverwritePrompt = true, CheckPathExists = true, Title = "حفظ ملف المعلم — لا يتم فتحه تلقائيًا" };
        if (dialog.ShowDialog(this) != DialogResult.OK) return;
        busy = true; save.Enabled = false;
        try
        {
            using var request = new StringContent(JsonSerializer.Serialize(new { id = file.Id }), Encoding.UTF8, "application/json");
            using var response = await client.PostAsync("http://127.0.0.1:4190/files/local/download", request); response.EnsureSuccessStatusCode();
            var data = await response.Content.ReadAsByteArrayAsync(); if (IsDisposed) return;
            await ReceivedFileWriter.WriteAsync(data, file.Size, file.Hash, dialog.FileName, lifetime.Token);
            state.Text = "حُفظ الملف بعد التحقق من سلامته؛ لم يُفتح تلقائيًا";
            try { using var body = new StringContent(JsonSerializer.Serialize(new { id = file.Id }), Encoding.UTF8, "application/json"); using var receipt = await client.PostAsync("http://127.0.0.1:4190/files/local/saved", body); if (!receipt.IsSuccessStatusCode && !IsDisposed) state.Text = "حُفظ الملف؛ تعذر التأكد من تسجيل الحفظ لدى المعلم"; }
            catch (Exception ex) when (ex is HttpRequestException or OperationCanceledException or ObjectDisposedException) { if (!IsDisposed) state.Text = "حُفظ الملف؛ تعذر تأكيد الحفظ للمعلم"; }
        }
        catch (Exception ex) when (ex is HttpRequestException or OperationCanceledException or ObjectDisposedException or IOException or InvalidDataException or UnauthorizedAccessException or JsonException) { if (!IsDisposed) state.Text = "تعذر استلام الملف أو حفظه؛ تحقق من الاتصال ومكان الحفظ"; }
        finally { busy = false; if (!IsDisposed) save.Enabled = list.SelectedItem is Item; }
    }
}
