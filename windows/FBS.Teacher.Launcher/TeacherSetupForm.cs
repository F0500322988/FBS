using System.Drawing;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Windows.Forms;

namespace FBS.Teacher.Launcher;

internal sealed class TeacherSetupForm : Form
{
    private readonly TextBox pairing = new() { Width = 440, UseSystemPasswordChar = true, MaxLength = 8 };
    private readonly TextBox password = new() { Width = 440, UseSystemPasswordChar = true, MaxLength = 8 };
    private readonly TextBox confirmation = new() { Width = 440, UseSystemPasswordChar = true, MaxLength = 8 };
    private readonly TextBox certPath = new() { Width = 440, ReadOnly = true };
    private readonly TextBox keyPath = new() { Width = 440, ReadOnly = true };
    private readonly TextBox host = new() { Width = 440, Text = System.Net.Dns.GetHostName(), MaxLength = 253 };
    private readonly Label status = new() { Width = 460, Height = 70 };
    internal TeacherConnectionSettings? Settings { get; private set; }

    internal TeacherSetupForm()
    {
        Text = "FBS Classroom — إعداد المعلم لأول مرة";
        RightToLeft = RightToLeft.Yes;
        RightToLeftLayout = true;
        ClientSize = new Size(520, 760);
        Font = new Font("Segoe UI", 10);
        var layout = new FlowLayoutPanel { Dock = DockStyle.Fill, AutoScroll = true,
            FlowDirection = FlowDirection.TopDown, WrapContents = false, Padding = new Padding(18) };
        Controls.Add(layout);
        void Add(string label, Control field) { layout.Controls.Add(new Label { Text = label, AutoSize = true }); layout.Controls.Add(field); }
        layout.Controls.Add(new Label { Text = "الإعدادات محفوظة لحساب ويندوز الحالي فقط. لا تُرسل أسرارك عبر المحادثات.", Width = 460, Height = 50 });
        Add("مفتاح المعمل (8 أرقام بالضبط؛ يُضبط نفسه على الطالب)", pairing);
        Add("كلمة مرور لوحة المعلم (8 أرقام بالضبط)", password);
        Add("تأكيد كلمة المرور", confirmation);
        Add("شهادة المعلم بصيغة PEM", certPath);
        var certButton = new Button { Text = "اختيار الشهادة", AutoSize = true };
        certButton.Click += (_, _) => Choose(certPath);
        layout.Controls.Add(certButton);
        Add("المفتاح الخاص المطابق بصيغة PEM", keyPath);
        var keyButton = new Button { Text = "اختيار المفتاح الخاص", AutoSize = true };
        keyButton.Click += (_, _) => Choose(keyPath);
        layout.Controls.Add(keyButton);
        Add("اسم المعلم في الشبكة أو عنوان IPv4 لإنشاء شهادة محلية", host);
        var generate = new Button { Text = "إنشاء شهادة محلية جديدة لهذا العنوان", AutoSize = true };
        generate.Click += (_, _) => GenerateCertificate();
        layout.Controls.Add(generate);
        layout.Controls.Add(new Label { Text = "يمكن اختيار شهادة موجودة أو إنشاء شهادة محلية. انقل البصمة للطالب عبر المسؤول؛ لا تنقل المفتاح الخاص.", Width = 460, Height = 55 });
        var save = new Button { Text = "التحقق والحفظ ثم تشغيل المعلم", AutoSize = true };
        save.Click += (_, _) => SaveSettings();
        layout.Controls.Add(save);
        layout.Controls.Add(status);
        FormClosed += (_, _) => { pairing.Clear(); password.Clear(); confirmation.Clear(); };
    }

    private void Choose(TextBox field)
    {
        using var dialog = new OpenFileDialog { Filter = "PEM files (*.pem)|*.pem|All files (*.*)|*.*", CheckFileExists = true };
        if (dialog.ShowDialog(this) == DialogResult.OK) field.Text = dialog.FileName;
    }

    private void SaveSettings()
    {
        pairing.Text = FBS.Student.Native.CredentialPolicy.NormalizeDigits(pairing.Text);
        password.Text = FBS.Student.Native.CredentialPolicy.NormalizeDigits(password.Text);
        confirmation.Text = FBS.Student.Native.CredentialPolicy.NormalizeDigits(confirmation.Text);
        if (!FBS.Student.Native.CredentialPolicy.IsPin(pairing.Text) || !FBS.Student.Native.CredentialPolicy.IsPin(password.Text))
        { status.Text = "مفتاح المعمل وكلمة المرور يجب أن يتكونا من 8 أرقام بالضبط."; return; }
        if (password.Text != confirmation.Text) { status.Text = "تأكيد كلمة المرور غير مطابق."; return; }
        try
        {
            var settings = new TeacherConnectionSettings(1, pairing.Text, password.Text, certPath.Text, keyPath.Text);
            settings.SaveNew();
            Settings = settings;
            DialogResult = DialogResult.OK;
            Close();
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or CryptographicException or ArgumentException)
        {
            status.Text = "لم يُحفظ الإعداد. تحقق من أطوال الأسرار وصلاحية ملفات PEM وتطابق الشهادة والمفتاح. لن تُستبدل إعدادات موجودة تلقائيًا.";
        }
    }

    private void GenerateCertificate()
    {
        try
        {
            var generated = TeacherCertificateFactory.Create(host.Text);
            var directory = Path.Combine(TeacherConnectionSettings.StateDirectory, "certificates", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            // The PEM private key must be readable by Node but never by other lab users.
            var acl = new System.Security.AccessControl.DirectorySecurity();
            acl.SetAccessRuleProtection(isProtected: true, preserveInheritance: false);
            var user = System.Security.Principal.WindowsIdentity.GetCurrent().User
                ?? throw new UnauthorizedAccessException("Windows account identity unavailable");
            acl.AddAccessRule(new System.Security.AccessControl.FileSystemAccessRule(user,
                System.Security.AccessControl.FileSystemRights.FullControl,
                System.Security.AccessControl.InheritanceFlags.ContainerInherit | System.Security.AccessControl.InheritanceFlags.ObjectInherit,
                System.Security.AccessControl.PropagationFlags.None, System.Security.AccessControl.AccessControlType.Allow));
            new DirectoryInfo(directory).SetAccessControl(acl);
            var cert = Path.Combine(directory, "teacher-cert.pem");
            var key = Path.Combine(directory, "teacher-key.pem");
            File.WriteAllText(cert, generated.CertificatePem);
            File.WriteAllText(key, generated.PrivateKeyPem);
            certPath.Text = cert;
            keyPath.Text = key;
            status.Text = "أُنشئت شهادة محلية. بصمة SHA-256 (ليست سرًا):\n" + generated.Fingerprint;
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or CryptographicException or ArgumentException)
        {
            status.Text = "تعذر إنشاء الشهادة. تحقق من عنوان المعلم وأذونات مجلد المستخدم.";
        }
    }
}
