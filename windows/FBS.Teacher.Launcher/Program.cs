using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Windows.Forms;

namespace FBS.Teacher.Launcher;
internal static class Program
{
    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();
        if (Environment.GetCommandLineArgs().Contains("--admin"))
        { Application.Run(new TeacherAdminAuditForm()); return; }
        var root = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "Runtime"));
        var server = Path.Combine(root, "server.js");
        if (!File.Exists(server))
        {
            MessageBox.Show("لم يتم العثور على server.js. شغّل البرنامج من مجلد dist بجانب ملفات المشروع.", "FBS Classroom");
            return;
        }
        TeacherConnectionSettings? savedSettings = null;
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FBS_PAIRING_KEY")) ||
            string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FBS_TEACHER_PASSWORD")) ||
            string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FBS_TLS_CERT")) ||
            string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FBS_TLS_KEY")))
        {
            try
            {
                savedSettings = TeacherAutomaticSetup.LoadOrCreate();
            }
            catch (Exception)
            {
                if (Environment.GetCommandLineArgs().Contains("--desktop-smoke-check")) { Environment.ExitCode = 2; return; }
                MessageBox.Show("تعذر فتح إعدادات المعلم المحمية. استخدم حساب ويندوز الذي أنشأ الإعداد وتحقق من الشهادة. لن تُحذف أو تُستبدل الإعدادات تلقائيًا.", "FBS Classroom");
                return;
            }
        }
        try
        {
            var startInfo = new ProcessStartInfo(Path.Combine(root, "node.exe"), "\"" + server + "\"")
            {
                WorkingDirectory = root,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            savedSettings?.Apply(startInfo);
            startInfo.Environment["FBS_DEMO"] = "0";
            startInfo.Environment["FBS_AUTO_ENROLL"] = "1";
            var desktopToken = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
            startInfo.Environment["FBS_DESKTOP_TOKEN"] = desktopToken;
            // Installed application files may be read-only (Program Files).
            // Keep enrollment state under the Windows account running the teacher.
            var stateDirectory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "FBSClassroom", "Teacher");
            Directory.CreateDirectory(stateDirectory);
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FBS_ENROLLMENT_FILE")))
                startInfo.Environment["FBS_ENROLLMENT_FILE"] = Path.Combine(stateDirectory, "enrollment.json");
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FBS_LAB_SETTINGS_FILE")))
                startInfo.Environment["FBS_LAB_SETTINGS_FILE"] = Path.Combine(stateDirectory, "lab-settings.json");
            startInfo.Environment["PORT"] = "4177";
            var startupId = Guid.NewGuid().ToString("N");
            startInfo.Environment["FBS_STARTUP_ID"] = startupId;
            using var process = Process.Start(startInfo);
            if (process == null) throw new Exception("تعذّر بدء خادم المعلم");
            try
            {
                using var client = new HttpClient(new HttpClientHandler { UseProxy = false }) { Timeout = TimeSpan.FromSeconds(1) };
                var deadline = DateTime.UtcNow.AddSeconds(15);
                bool ready = false;
                while (DateTime.UtcNow < deadline)
                {
                    if (process.HasExited) throw new Exception("توقف الخادم أثناء التشغيل. تحقق من إعدادات TLS وتوفر المنفذ 4177.");
                    try
                    {
                        using var response = client.GetAsync("http://127.0.0.1:4177/api/auth").GetAwaiter().GetResult();
                        var body = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
                        using var auth = System.Text.Json.JsonDocument.Parse(body);
                        ready = response.IsSuccessStatusCode && auth.RootElement.TryGetProperty("required", out var required) && required.ValueKind == System.Text.Json.JsonValueKind.True
                            && auth.RootElement.TryGetProperty("startupId", out var instance) && instance.GetString() == startupId;
                    }
                    catch (Exception ex) when (ex is HttpRequestException or System.Threading.Tasks.TaskCanceledException or System.Text.Json.JsonException) { }
                    if (ready) break;
                    System.Threading.Thread.Sleep(200);
                }
                if (!ready || process.HasExited) throw new Exception("لم يكتمل بدء خادم المعلم خلال المهلة المحددة.");
                Application.Run(new TeacherDesktopForm(desktopToken));
            }
            finally { if (!process.HasExited) process.Kill(entireProcessTree: true); }
        }
        catch (Exception ex)
        {
            if (Environment.GetCommandLineArgs().Contains("--desktop-smoke-check")) { Environment.ExitCode = 2; return; }
            MessageBox.Show("تعذر التشغيل: " + ex.Message + "\nتأكد من تثبيت Node.js وإعداد الاتصال.", "FBS Classroom");
        }
    }
}
