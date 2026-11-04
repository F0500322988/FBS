using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace FBS.Teacher.Launcher;

/// <summary>
/// M150: read-only local administrator audit entry point in the teacher launcher.
/// No enrollment changes, secret prompts, or network administration are exposed.
/// The auditor must be installed separately and executed under the provisioning account.
/// </summary>
internal sealed class TeacherAdminAuditForm : Form
{
    private readonly TextBox directory = new() { Width = 460, ReadOnly = true };
    private readonly Label status = new() { AutoSize = true, MaximumSize = new System.Drawing.Size(470, 0), Text = "لم يبدأ الفحص" };
    internal TeacherAdminAuditForm()
    {
        Text = "FBS Classroom - فحص إدارة أجهزة المعمل";
        Width = 560; Height = 310; StartPosition = FormStartPosition.CenterScreen;
        RightToLeft = RightToLeft.Yes; RightToLeftLayout = true;
        var layout = new FlowLayoutPanel { Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown,
            WrapContents = false, Padding = new Padding(16), AutoScroll = true };
        layout.Controls.Add(new Label { AutoSize = true, Text = "فحص إعدادات المسؤول محليًا (قراءة فقط)" });
        layout.Controls.Add(directory);
        var choose = new Button { Text = "اختيار مجلد المسؤول", AutoSize = true };
        choose.Click += (_, _) => { using var picker = new FolderBrowserDialog();
            if (picker.ShowDialog(this) == DialogResult.OK) directory.Text = picker.SelectedPath; };
        layout.Controls.Add(choose);
        var run = new Button { Text = "فحص سلامة الإعدادات", AutoSize = true };
        run.Click += async (_, _) =>
        {
            if (!Directory.Exists(directory.Text)) { status.Text = "اختر مجلدًا موجودًا"; return; }
            var auditor = Path.Combine(AppContext.BaseDirectory, "FBS.Admin.Audit.exe");
            if (!File.Exists(auditor)) { status.Text = "أداة الفحص غير مثبتة بجوار برنامج المعلم. لم تُجرَ أي تغييرات."; return; }
            run.Enabled = false;
            try
            {
                using var process = new Process { StartInfo = new ProcessStartInfo(auditor)
                { UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true,
                  RedirectStandardError = true, ArgumentList = { directory.Text } } };
                process.Start();
                await process.WaitForExitAsync();
                status.Text = process.ExitCode == 0 ? "PASS: إعدادات المسؤول سليمة وفق فحص الأداة" :
                    "FAIL: لم يجتز مجلد المسؤول فحص الأمان. لم تُجرَ أي تغييرات.";
            }
            catch (Exception ex) when (ex is System.ComponentModel.Win32Exception or IOException or InvalidOperationException)
            { status.Text = "تعذر تشغيل الفحص المحلي. لم تُجرَ أي تغييرات."; }
            finally { run.Enabled = true; }
        };
        layout.Controls.Add(run);
        var manage = new Button { Text = "إدارة تسجيل الأجهزة (مسؤول المعمل)", AutoSize = true };
        manage.Click += (_, _) =>
        {
            if (!Directory.Exists(directory.Text)) { status.Text = "اختر مجلد المسؤول الموجود أولًا"; return; }
            try
            {
                // Teacher-side local management only. Validate ACL before reading DPAPI secrets.
                AdministratorDirectoryAcl.Validate(directory.Text);
                foreach (var name in new[] { "admin-credentials.dpapi", "managed-devices.enc", "admin-lockout.enc" })
                {
                    var file = Path.Combine(directory.Text, name);
                    if (!File.Exists(file) || (File.GetAttributes(file) & FileAttributes.ReparsePoint) != 0 ||
                        new FileInfo(file).Length == 0)
                        throw new InvalidDataException("Incomplete administrator state");
                }
                var service = FBS.Student.Native.WindowsEnrollmentBootstrap.OpenExisting(directory.Text);
                using var dialog = new FBS.Student.Native.ManagedEnrollmentAdminForm(service);
                dialog.ShowDialog(this);
                status.Text = "أُغلقت نافذة إدارة الأجهزة";
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or
                ArgumentException or System.Security.Cryptography.CryptographicException or
                PlatformNotSupportedException)
            { status.Text = "تعذر فتح إدارة الأجهزة: إعدادات المسؤول أو صلاحياتها غير صالحة"; }
        };
        layout.Controls.Add(manage);
        var pairing = new Button { Text = "اختبار اتصال وهوية أجهزة الطلاب (TLS)", AutoSize = true };
        pairing.Click += (_, _) => { using var dialog = new TeacherPairingAuditForm(); dialog.ShowDialog(this); };
        layout.Controls.Add(pairing);
        layout.Controls.Add(status); Controls.Add(layout);
    }
}
