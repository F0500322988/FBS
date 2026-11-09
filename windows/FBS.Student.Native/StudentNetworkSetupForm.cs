using System.Drawing;
using System.Security.Cryptography;
using System.Text;
using System.Windows.Forms;

namespace FBS.Student.Native;

internal sealed class StudentNetworkSetupForm : Form
{
    private readonly TextBox key = new() { Width = 390, UseSystemPasswordChar = true, MaxLength = 8 };
    private readonly TextBox confirm = new() { Width = 390, UseSystemPasswordChar = true, MaxLength = 8 };
    private readonly Label status = new() { Width = 410, Height = 70 };
    internal static string KeyFile => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "FBSClassroom", "pairing.dpapi");

    internal StudentNetworkSetupForm()
    {
        Text = "FBS Classroom — إعداد اتصال الطالب";
        RightToLeft = RightToLeft.Yes;
        RightToLeftLayout = true;
        ClientSize = new Size(460, 330);
        Font = new Font("Segoe UI", 10);
        var layout = new FlowLayoutPanel { Dock = DockStyle.Fill, Padding = new Padding(18),
            FlowDirection = FlowDirection.TopDown, WrapContents = false, AutoScroll = true };
        Controls.Add(layout);
        layout.Controls.Add(new Label { Text = "أدخل مفتاح المعمل الذي يقدمه المسؤول. الاتصال لا يمنح التحكم ولا يبدأ مشاركة الشاشة تلقائيًا.", Width = 410, Height = 60 });
        layout.Controls.Add(new Label { Text = "مفتاح المعمل (من 3 إلى 8 أرقام)", AutoSize = true });
        layout.Controls.Add(key);
        layout.Controls.Add(new Label { Text = "تأكيد المفتاح", AutoSize = true });
        layout.Controls.Add(confirm);
        var save = new Button { Text = "حفظ لحساب ويندوز الحالي", AutoSize = true };
        layout.Controls.Add(save);
        layout.Controls.Add(status);
        save.Click += (_, _) => SaveKey();
        FormClosed += (_, _) => { key.Clear(); confirm.Clear(); };
    }

    private void SaveKey()
    {
        key.Text = CredentialPolicy.NormalizeDigits(key.Text);
        confirm.Text = CredentialPolicy.NormalizeDigits(confirm.Text);
        if (!CredentialPolicy.IsPin(key.Text) || key.Text != confirm.Text)
        {
            status.Text = "أدخل مفتاحًا من 3 إلى 8 أرقام، مع تأكيد مطابق.";
            return;
        }
        try
        {
            // PowerShell ConvertTo-SecureString's current-user DPAPI format:
            // hex-encoded DPAPI bytes protecting UTF-16LE secret bytes.
            StudentPairingKeyStore.SaveNew(KeyFile, key.Text);
            DialogResult = DialogResult.OK;
            Close();
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or CryptographicException)
        {
            status.Text = "تعذر حفظ المفتاح. لن يُستبدل إعداد موجود تلقائيًا. تحقق من حساب المستخدم وأذونات المجلد.";
        }
    }
}
