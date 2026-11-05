using System.Drawing;
using System.Windows.Forms;

namespace FBS.Student.Native;

internal sealed class StudentTeacherConnectionForm : Form
{
    private readonly CheckBox manual = new() { Text = "تحديد المعلم بعنوان وبصمة شهادة موثوقة", AutoSize = true };
    private readonly TextBox host = new() { Width = 430, Enabled = false, PlaceholderText = "192.168.1.10 أو teacher.lab" };
    private readonly NumericUpDown port = new() { Minimum = 1, Maximum = 65535, Value = 4180, Enabled = false };
    private readonly TextBox pin = new() { Width = 430, MaxLength = 64, Enabled = false };
    private readonly Label status = new() { Width = 440, Height = 65 };
    internal StudentTeacherConnectionSettings? Settings { get; private set; }

    internal StudentTeacherConnectionForm(StudentTeacherConnectionSettings? existing = null)
    {
        Text = "FBS Classroom — اختيار اتصال المعلم";
        RightToLeft = RightToLeft.Yes; RightToLeftLayout = true;
        Font = new Font("Segoe UI", 10); ClientSize = new Size(490, 440);
        var layout = new FlowLayoutPanel { Dock = DockStyle.Fill, Padding = new Padding(18), FlowDirection = FlowDirection.TopDown, WrapContents = false, AutoScroll = true };
        Controls.Add(layout);
        layout.Controls.Add(new Label { Text = "الاكتشاف التلقائي يستخدم مفتاح المعمل. إذا كانت الشبكة تمنع الاكتشاف، اطلب عنوان المعلم وبصمة شهادته من المسؤول واختر التحديد اليدوي.", Width = 440, Height = 80 });
        layout.Controls.Add(manual);
        layout.Controls.Add(new Label { Text = "عنوان المعلم (127.0.0.1 للتجربة على الجهاز نفسه)", AutoSize = true }); layout.Controls.Add(host);
        layout.Controls.Add(new Label { Text = "منفذ اتصال الطلاب", AutoSize = true }); layout.Controls.Add(port);
        layout.Controls.Add(new Label { Text = "بصمة شهادة المعلم SHA-256 (64 رمزًا)", AutoSize = true }); layout.Controls.Add(pin);
        manual.CheckedChanged += (_, _) => host.Enabled = port.Enabled = pin.Enabled = manual.Checked;
        if (existing is not null)
        {
            existing.Validate();
            host.Text = existing.Host; pin.Text = existing.Fingerprint;
            port.Value = existing.Discovery ? 4180 : existing.Port;
            manual.Checked = !existing.Discovery;
        }
        var save = new Button { Text = existing is null ? "حفظ اختيار الاتصال" : "حفظ التعديل — يُطبّق بعد إعادة تشغيل الطالب", AutoSize = true }; layout.Controls.Add(save); layout.Controls.Add(status);
        save.Click += (_, _) =>
        {
            try
            {
                var settings = manual.Checked
                    ? new StudentTeacherConnectionSettings(1, false, host.Text.Trim(), (int)port.Value, pin.Text.Trim())
                    : new StudentTeacherConnectionSettings(1, true, "", 0, "");
                if (existing is null) settings.SaveNew();
                else settings.ReplaceExisting(existing);
                Settings = settings; DialogResult = DialogResult.OK; Close();
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or System.Text.Json.JsonException)
            {
                status.Text = "لم يُحفظ الاختيار. تحقق من العنوان والمنفذ والبصمة؛ لن تُستبدل إعدادات موجودة تلقائيًا.";
            }
        };
    }
}
