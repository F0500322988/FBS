using System;
using System.Diagnostics;
using System.IO;
using System.Security.Cryptography;
using System.Windows.Forms;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace FBS.Student.Native;

// M17: starts the existing LAN agent in the signed-in user's interactive session.
// The agent cannot operate without a DPAPI-protected pairing key configured by the user.
internal sealed class AgentHost : IDisposable
{
    private Process? process;
    private readonly CancellationTokenSource lifetime = new();
    private bool starting;
    private bool disposed;
    public string LocalControlToken { get; } = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    public bool Running => !disposed && process is { HasExited: false };
    public string Status { get; private set; } = "لم يتم تشغيل وكيل الشبكة";

    public async Task StartAsync(bool allowSetup = true)
    {
        if (disposed || starting || Running) return;
        starting = true;
        try
        {
        var app = AppContext.BaseDirectory;
        var runtime = Path.GetFullPath(Path.Combine(app, "..", "Runtime"));
        var node = Path.Combine(runtime, "node.exe");
        var agent = Path.Combine(runtime, "student-agent.js");
        var credential = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "FBSClassroom", "pairing.dpapi");
        if (!File.Exists(node) || !File.Exists(agent)) { Status = "ملفات وكيل الشبكة غير موجودة"; return; }
        if (!File.Exists(credential))
        {
            if (!allowSetup) { Status = "انتظار استيراد حزمة المعلم بواسطة مسؤول المعمل"; return; }
            using var setup = new StudentNetworkSetupForm();
            if (setup.ShowDialog() != DialogResult.OK) { Status = "لم يكتمل إعداد مفتاح المعمل"; return; }
        }
        if (disposed) return;
        var connection = StudentTeacherConnectionSettings.Load();
        if (connection is null)
        {
            if (!allowSetup) { Status = "انتظار تهيئة عنوان المعلم بواسطة مسؤول المعمل"; return; }
            using var setup = new StudentTeacherConnectionForm();
            if (setup.ShowDialog() != DialogResult.OK) { Status = "لم يكتمل اختيار اتصال المعلم"; return; }
            connection = setup.Settings ?? throw new InvalidDataException("Missing teacher connection settings");
        }
        if (disposed) return;
        // Decrypt under the same Windows account and launch Node directly.
        // No secret is embedded in the command line or persisted in plaintext.
            var labKey = StudentPairingKeyStore.OpenExisting(credential);
            var startInfo = new ProcessStartInfo(node)
            {
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden,
                WorkingDirectory = runtime
            };
            startInfo.ArgumentList.Add(agent);
            connection.Apply(startInfo);
            startInfo.Environment["FBS_PAIRING_KEY"] = labKey;
            startInfo.Environment["FBS_LOCAL_CONTROL_TOKEN"] = LocalControlToken;
            startInfo.Environment["FBS_ASSISTANCE_UI"] = "1";
            startInfo.Environment["FBS_POWER_UI"] = "1";
            startInfo.Environment["FBS_LOCAL_PORT"] = "4190";
            var owned = Process.Start(startInfo);
            process = owned;
            if (owned is null) { Status = "تعذّر تشغيل وكيل الشبكة"; return; }
            Status = "جارٍ التحقق من جاهزية وكيل الطالب";
            using var client = new HttpClient(new HttpClientHandler { UseProxy = false }) { Timeout = TimeSpan.FromSeconds(1) };
            client.DefaultRequestHeaders.Add("X-FBS-Local-Token", LocalControlToken);
            var deadline = DateTime.UtcNow.AddSeconds(15);
            while (DateTime.UtcNow < deadline)
            {
                lifetime.Token.ThrowIfCancellationRequested();
                if (owned.HasExited) { Status = "توقف وكيل الطالب أثناء البدء؛ تحقق من الإعداد وتوفر المنفذ 4190"; StopOwnedProcess(); return; }
                try
                {
                    using var response = await client.GetAsync("http://127.0.0.1:4190/control/local", lifetime.Token);
                    var body = await response.Content.ReadAsStringAsync(lifetime.Token);
                    if (AgentReadiness.IsReady(response.StatusCode, body) && !owned.HasExited)
                    {
                        Status = "وكيل الطالب جاهز محليًا؛ انتظار الاتصال بالمعلم";
                        return;
                    }
                }
                catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
                {
                    if (lifetime.IsCancellationRequested) return;
                }
                await Task.Delay(200, lifetime.Token);
            }
            Status = "لم يستجب وكيل الطالب خلال المهلة؛ تحقق من المنفذ 4190";
            StopOwnedProcess();
        }
        catch (OperationCanceledException) when (disposed) { }
        catch (ObjectDisposedException) when (disposed) { }
        catch (Exception)
        {
            Status = "تعذّر تشغيل وكيل الطالب. تحقق من إعداد المفتاح واتصال المعلم وحساب ويندوز وملفات التشغيل.";
            StopOwnedProcess();
        }
        finally { starting = false; if (disposed) lifetime.Dispose(); }
    }

    private void StopOwnedProcess()
    {
        try { if (process is { HasExited: false }) process.Kill(entireProcessTree: true); } catch { }
        process?.Dispose();
        process = null;
    }

    public void Dispose()
    {
        if (disposed) return;
        disposed = true;
        lifetime.Cancel();
        StopOwnedProcess();
        if (!starting) lifetime.Dispose();
    }
}
