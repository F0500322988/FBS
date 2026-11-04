using System.Drawing;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Windows.Forms;

namespace FBS.Teacher.Launcher;

internal sealed class TeacherConnectionInfoForm : Form
{
    internal TeacherConnectionInfoForm(string certificatePath, string port)
    {
        Text = "FBS Classroom — المعلم يعمل";
        RightToLeft = RightToLeft.Yes; RightToLeftLayout = true;
        Font = new Font("Segoe UI", 10); ClientSize = new Size(570, 390);
        var layout = new FlowLayoutPanel { Dock = DockStyle.Fill, Padding = new Padding(18), FlowDirection = FlowDirection.TopDown, WrapContents = false };
        Controls.Add(layout);
        layout.Controls.Add(new Label { Text = "لوحة المعلم مفتوحة في المتصفح. أبقِ هذه النافذة مفتوحة أثناء الدرس. يمكن نسخ البيانات التالية لإعداد اتصال الطالب؛ لا تتضمن كلمة مرور أو مفتاح المعمل.", Width = 525, Height = 75 });
        var addresses = NetworkInterface.GetAllNetworkInterfaces().Where(n => n.OperationalStatus == OperationalStatus.Up)
            .SelectMany(n => n.GetIPProperties().UnicastAddresses).Select(a => a.Address)
            .Where(a => a.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(a) && !a.ToString().StartsWith("169.254."))
            .Select(a => a.ToString()).Distinct();
        using var certificate = X509Certificate2.CreateFromPem(File.ReadAllText(certificatePath));
        var fingerprint = Convert.ToHexString(SHA256.HashData(certificate.RawData));
        var details = new TextBox { Width = 525, Height = 190, Multiline = true, ReadOnly = true, ScrollBars = ScrollBars.Vertical,
            Text = "اسم جهاز المعلم: " + Dns.GetHostName() + Environment.NewLine + "عناوين IPv4 المتاحة: " + string.Join(", ", addresses)
                + Environment.NewLine + "للتجربة على الجهاز نفسه: 127.0.0.1" + Environment.NewLine + "منفذ الطلاب: " + port
                + Environment.NewLine + "بصمة الشهادة SHA-256:" + Environment.NewLine + fingerprint };
        layout.Controls.Add(details);
        var stop = new Button { Text = "إيقاف خادم المعلم", AutoSize = true }; stop.Click += (_, _) => Close(); layout.Controls.Add(stop);
    }
}
