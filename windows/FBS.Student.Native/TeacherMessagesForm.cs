using System.Net.Http;
using System.Text;
using System.Text.Json;

namespace FBS.Student.Native;

// Text only: no HTML, links, commands, files or remote-input permissions.
internal sealed class TeacherMessagesForm : Form
{
    private readonly HttpClient client = new(new HttpClientHandler { UseProxy = false }) { Timeout = TimeSpan.FromSeconds(2) };
    private readonly System.Windows.Forms.Timer timer = new() { Interval = 2000 };
    private readonly ListBox list = new() { Dock = DockStyle.Top, Height = 120 };
    private readonly TextBox content = new() { Dock = DockStyle.Fill, Multiline = true, ReadOnly = true, ScrollBars = ScrollBars.Vertical };
    private readonly Label state = new() { Dock = DockStyle.Bottom, Height = 36, Text = "جاري تحديث الرسائل..." };
    private readonly Button read = new() { Dock = DockStyle.Bottom, Height = 42, Text = "تأكيد قراءة الرسالة", Enabled = false };
    private bool busy;
    private sealed record Message(string Id, string Text, bool Read)
    {
        public override string ToString() => (Read ? "✓ " : "● ") + (Text.Length > 55 ? Text[..55] + "…" : Text).Replace('\n', ' ');
    }
    public TeacherMessagesForm(string token)
    {
        Text = "FBS Classroom — رسائل المعلم";
        RightToLeft = RightToLeft.Yes; RightToLeftLayout = true;
        Size = new Size(620, 460); MinimumSize = new Size(400, 320);
        Font = new Font("Segoe UI", 11); StartPosition = FormStartPosition.CenterParent;
        Controls.Add(content); Controls.Add(list); Controls.Add(read); Controls.Add(state);
        client.DefaultRequestHeaders.Add("X-FBS-Local-Token", token);
        list.SelectedIndexChanged += (_, _) => SelectMessage();
        read.Click += async (_, _) => await MarkRead();
        timer.Tick += async (_, _) => await RefreshMessages();
        Shown += async (_, _) => { timer.Start(); await RefreshMessages(); };
        FormClosed += (_, _) => { timer.Stop(); timer.Dispose(); client.Dispose(); };
    }
    private void SelectMessage()
    {
        var selected = list.SelectedItem as Message;
        content.Text = selected?.Text ?? "";
        read.Enabled = selected is { Read: false } && !busy;
    }
    private async Task RefreshMessages()
    {
        if (busy || IsDisposed) return;
        busy = true;
        try
        {
            var raw = await client.GetStringAsync("http://127.0.0.1:4190/messages/local");
            using var doc = JsonDocument.Parse(raw);
            if (IsDisposed) return;
            var selectedId = (list.SelectedItem as Message)?.Id;
            list.BeginUpdate(); list.Items.Clear();
            foreach (var item in doc.RootElement.GetProperty("messages").EnumerateArray())
            {
                list.Items.Add(new Message(item.GetProperty("id").GetString()!, item.GetProperty("text").GetString()!, item.GetProperty("read").GetBoolean()));
            }
            for (var i = 0; i < list.Items.Count; i++) if (((Message)list.Items[i]).Id == selectedId) list.SelectedIndex = i;
            if (list.SelectedIndex < 0 && list.Items.Count > 0) list.SelectedIndex = 0;
            list.EndUpdate();
            state.Text = list.Items.Count == 0 ? "لا توجد رسائل نشطة؛ تنتهي صلاحية الرسالة بعد خمس دقائق" : "اختر رسالة ثم أكّد قراءتها؛ لا يُرسل التأكيد بمجرد فتح النافذة";
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException or ObjectDisposedException)
        {
            if (!IsDisposed) { list.Items.Clear(); content.Clear(); state.Text = "تعذر الاتصال بوكيل الطالب؛ أُخفيت الرسائل القديمة"; }
        }
        finally { busy = false; if (!IsDisposed) SelectMessage(); }
    }
    private async Task MarkRead()
    {
        if (busy || list.SelectedItem is not Message message) return;
        busy = true; read.Enabled = false;
        try
        {
            using var body = new StringContent(JsonSerializer.Serialize(new { id = message.Id }), Encoding.UTF8, "application/json");
            using var response = await client.PostAsync("http://127.0.0.1:4190/messages/local/read", body);
            if (!IsDisposed) state.Text = response.IsSuccessStatusCode ? "سُجلت القراءة محليًا؛ يُرسل التأكيد للمعلم عند التحديث التالي" : "الرسالة غير متاحة أو انتهت صلاحيتها";
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or ObjectDisposedException)
        { if (!IsDisposed) state.Text = "تعذر تسجيل القراءة"; }
        finally { busy = false; if (!IsDisposed) await RefreshMessages(); }
    }
}
