using System.Diagnostics;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using Microsoft.Win32;
using FBS.Teacher.Launcher;

namespace FBS.LabSetup;

internal static class Program
{
    internal static readonly string[] KitFiles = { "FBS-LabSetup-Windows.exe", "FBS-LabSetup-Mac", "Prepare-Teacher-Windows.cmd", "Prepare-Teacher-Mac.command", "Setup-Student-Windows.cmd", "Setup-Student-Mac.command", "README-AR.md" };
    [STAThread] private static int Main(string[] args)
    {
        Console.OutputEncoding = Encoding.UTF8;
        try
        {
            if (args.Length == 1 && args[0] == "self-test") { ProvisioningTests.Run(); return 0; }
            if (args.Length is >= 1 and <= 3 && args[0] == "export")
            {
                var saved = TeacherConnectionSettings.Load() ?? throw new IOException("Set up and run the teacher application first, under this Windows account.");
                var host = args.Length >= 2 ? args[1] : SelectHost();
                var destination = args.Length == 3 ? args[2] : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "FBS-Student-Kit-" + DateTime.Now.ToString("yyyyMMdd-HHmmss") + "-" + Guid.NewGuid().ToString("N")[..6]);
                Export(saved, host, destination, AppContext.BaseDirectory);
                Console.WriteLine("تم إنشاء حزمة الطلاب الخاصة في: " + destination);
                Console.WriteLine("انقل المجلد عبر وسيط موثوق. يحتوي lab-profile.json على مفتاح المعمل؛ لا ترفعه إلى GitHub أو المحادثة.");
                return 0;
            }
            if (args.Length == 2 && args[0] == "import")
            {
                var profile = LabProfile.Read(args[1]);
                using var registry = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\FBSClassroom.Student.Preview");
                var root = registry?.GetValue("InstallLocation") as string;
                if (root is null || registry?.GetValue("DisplayVersion") as string != "0.183.0-preview") throw new IOException("Install Student M183 for this Windows account first.");
                var executable = Path.Combine(root, "Student", "FBS.Student.Native.exe"); FileSafety.Regular(executable, 2_000_000);
                if (Process.GetProcessesByName("FBS.Student.Native").Any(p => p.SessionId == Process.GetCurrentProcess().SessionId))
                    throw new IOException("Close the student application first, then run setup again.");
                var state = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "FBSClassroom");
                var outcome = StudentProvisioning.Apply(profile, state);
                Console.WriteLine("إعداد الطالب: " + outcome + " | المعلم: " + profile.TeacherHost + ":" + profile.TeacherPort);
                Console.WriteLine("افتح لوحة المعلم واعتمد هوية هذا الجهاز. لم تُنسخ أي هوية طالب ولم يُمنح التحكم تلقائيًا.");
                Process.Start(new ProcessStartInfo(executable) { UseShellExecute = true }); return 0;
            }
            Console.Error.WriteLine("Use: export [teacher-LAN-IP] [new-output-folder] | import lab-profile.json"); return 2;
        }
        catch (Exception)
        {
            // Never render exception messages containing JSON, paths supplied as profile data, or decrypted configuration.
            Console.Error.WriteLine("تعذر إكمال الإعداد. أغلق تطبيق الطالب، وتحقق من تثبيت M183 وحساب المستخدم وإعداد المعلم وملف الحزمة. الإعدادات الموجودة لا تُستبدل تلقائيًا. راجع README-AR.md.");
            return 1;
        }
    }
    private static string SelectHost()
    {
        var addresses = NetworkInterface.GetAllNetworkInterfaces().Where(n => n.OperationalStatus == OperationalStatus.Up && n.NetworkInterfaceType != NetworkInterfaceType.Loopback)
            .SelectMany(n => n.GetIPProperties().UnicastAddresses).Where(x => x.Address.AddressFamily == AddressFamily.InterNetwork)
            .Select(x => x.Address.ToString()).Where(x => !x.StartsWith("169.254.") && !x.StartsWith("127.")).Distinct().ToArray();
        if (addresses.Length == 1) { Console.WriteLine("عنوان المعلم: " + addresses[0]); return addresses[0]; }
        Console.WriteLine("اختر عنوان المعلم المتصل بشبكة المعمل (اكتب الرقم):");
        for (var i = 0; i < addresses.Length; i++) Console.WriteLine($"{i + 1}: {addresses[i]}");
        if (int.TryParse(Console.ReadLine(), out var selected) && selected > 0 && selected <= addresses.Length) return addresses[selected - 1];
        throw new IOException("No selected LAN address.");
    }
    internal static LabProfile FromTeacher(TeacherConnectionSettings saved, string host)
    {
        saved.Validate();
        using var certificate = X509Certificate2.CreateFromPem(File.ReadAllText(saved.CertificatePath));
        var result = new LabProfile(1, host, 4180, Convert.ToHexString(SHA256.HashData(certificate.RawData)).ToLowerInvariant(), saved.PairingKey);
        result.Validate(); return result;
    }
    internal static void Export(TeacherConnectionSettings saved, string host, string destination, string templates)
    {
        var profile = FromTeacher(saved, host);
        foreach (var name in KitFiles) FileSafety.Regular(Path.Combine(templates, name), 250_000_000);
        StudentProvisioning.MakePrivateDirectory(destination);
        // A failed export is left private and visible for inspection, never recursively cleaned up.
        foreach (var name in KitFiles) File.Copy(Path.Combine(templates, name), Path.Combine(destination, name), false);
        profile.WriteNew(Path.Combine(destination, "lab-profile.json"));
    }
}
