using System;
using System.IO;
using System.Windows.Forms;

namespace FBS.Student.Native;

/// <summary>
/// M142: local-only administrator enrollment dialog. It must be opened by a trusted
/// management application with a preconfigured ManagedEnrollmentCommandService.
/// No network listener, default credentials, or automatic enrollment are provided.
/// </summary>
public sealed class ManagedEnrollmentAdminForm : Form
{
    private readonly ManagedEnrollmentCommandService service;
    private readonly TextBox deviceId = new() { Width = 340 };
    private readonly TextBox keyFile = new() { Width = 340, ReadOnly = true };
    private readonly TextBox password = new() { Width = 340, UseSystemPasswordChar = true };
    private readonly Label status = new() { AutoSize = true, Text = "جاهز", MaximumSize = new System.Drawing.Size(360, 0) };

    public ManagedEnrollmentAdminForm(ManagedEnrollmentCommandService service)
    {
        this.service = service ?? throw new ArgumentNullException(nameof(service));
        Text = "FBS Classroom - إدارة تسجيل الأجهزة (محلي)";
        Width = 440; Height = 355; StartPosition = FormStartPosition.CenterParent;
        RightToLeft = RightToLeft.Yes; RightToLeftLayout = true;
        FormBorderStyle = FormBorderStyle.FixedDialog; MaximizeBox = false;
        var layout = new FlowLayoutPanel { Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown,
            WrapContents = false, AutoScroll = true, Padding = new Padding(14) };
        layout.Controls.Add(new Label { Text = "معرّف الجهاز", AutoSize = true });
        layout.Controls.Add(deviceId);
        layout.Controls.Add(new Label { Text = "المفتاح العام (DER / SubjectPublicKeyInfo)", AutoSize = true });
        layout.Controls.Add(keyFile);
        var choose = new Button { Text = "اختيار ملف المفتاح العام", AutoSize = true };
        choose.Click += (_, _) => {
            using var picker = new OpenFileDialog { Filter = "DER files (*.der)|*.der|All files (*.*)|*.*", CheckFileExists = true };
            if (picker.ShowDialog(this) == DialogResult.OK) keyFile.Text = picker.FileName;
        };
        layout.Controls.Add(choose);
        layout.Controls.Add(new Label { Text = "كلمة مرور مسؤول المعمل", AutoSize = true });
        layout.Controls.Add(password);
        var actions = new FlowLayoutPanel { Width = 370, Height = 42, FlowDirection = FlowDirection.RightToLeft };
        var register = new Button { Text = "تسجيل الجهاز", AutoSize = true };
        var revoke = new Button { Text = "إلغاء تسجيل الجهاز", AutoSize = true };
        register.Click += (_, _) => Execute(true);
        revoke.Click += (_, _) => Execute(false);
        actions.Controls.Add(register); actions.Controls.Add(revoke);
        layout.Controls.Add(actions);
        layout.Controls.Add(status);
        Controls.Add(layout);
        FormClosed += (_, _) => { password.Clear(); };
    }

    private void Execute(bool register)
    {
        try
        {
            // Never include password, key bytes or detailed authentication failures in the UI.
            if (string.IsNullOrWhiteSpace(deviceId.Text) || string.IsNullOrEmpty(password.Text))
            { status.Text = "أدخل معرّف الجهاز وكلمة مرور المسؤول"; return; }
            bool success;
            if (register)
            {
                var file = keyFile.Text;
                if (string.IsNullOrWhiteSpace(file) || !File.Exists(file))
                { status.Text = "اختر ملف مفتاح عام صالحًا"; return; }
                var info = new FileInfo(file);
                if (info.Length < 200 || info.Length > 2048)
                { status.Text = "حجم المفتاح العام غير صالح"; return; }
                success = service.Register(deviceId.Text, File.ReadAllBytes(file), password.Text, DateTimeOffset.UtcNow);
            }
            else success = service.Remove(deviceId.Text, password.Text, DateTimeOffset.UtcNow);
            status.Text = success ? "تم تنفيذ العملية" : "رُفضت العملية؛ تحقق من الصلاحيات والبيانات";
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or ArgumentException)
        { status.Text = "تعذر إكمال العملية بأمان"; }
        finally { password.Clear(); }
    }
}
