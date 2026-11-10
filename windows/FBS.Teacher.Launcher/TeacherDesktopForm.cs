using System.Net;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace FBS.Teacher.Launcher;

internal sealed class TeacherDesktopForm : Form
{
    private readonly WebView2 browser = new() { Dock = DockStyle.Fill };
    private readonly string capability;
    private static readonly Uri Origin = new("http://127.0.0.1:4177");
    internal TeacherDesktopForm(string token)
    {
        capability = token;
        Text = "FBS Classroom — لوحة المعلم";
        Icon = FBS.Student.Native.ApplicationBranding.LoadIcon();
        Width = 1280; Height = 850; MinimumSize = new Size(900, 600);
        Controls.Add(browser);
        Shown += async (_, _) => {
            try { await OpenDashboard(); }
            catch { if (Smoke) { Environment.ExitCode = 2; Close(); return; } MessageBox.Show(this, "تعذر فتح لوحة المعلم المدمجة. تحقق من تثبيت Microsoft Edge WebView2 Runtime ومن جاهزية خادم المعلم.", "FBS Classroom"); Close(); }
        };
    }
    private bool Smoke => Environment.GetCommandLineArgs().Contains("--desktop-smoke-check");
    private async Task OpenDashboard()
    {
        try { _ = CoreWebView2Environment.GetAvailableBrowserVersionString(); }
        catch (WebView2RuntimeNotFoundException) {
            var setup = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "SetupKit", "MicrosoftEdgeWebview2Setup.exe"));
            if (!File.Exists(setup)) throw;
            using var installer = System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(setup, "/silent /install") { UseShellExecute = false, CreateNoWindow = true });
            if (installer is null) throw new IOException("Runtime setup unavailable");
            await installer.WaitForExitAsync().WaitAsync(TimeSpan.FromMinutes(2));
            _ = CoreWebView2Environment.GetAvailableBrowserVersionString();
        }
        var environment = await CoreWebView2Environment.CreateAsync(null,
            Path.Combine(TeacherConnectionSettings.StateDirectory, "DesktopWebView"));
        await browser.EnsureCoreWebView2Async(environment);
        var core = browser.CoreWebView2;
        core.Settings.AreDevToolsEnabled = false;
        core.Settings.AreDefaultContextMenusEnabled = false;
        core.Settings.IsStatusBarEnabled = false;
        core.NavigationStarting += (_, e) => {
            if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out var url) || url.GetLeftPart(UriPartial.Authority) != Origin.GetLeftPart(UriPartial.Authority)) e.Cancel = true;
        };
        core.NewWindowRequested += (_, e) => e.Handled = true;
        using var handler = new HttpClientHandler { UseProxy = false, AllowAutoRedirect = false, CookieContainer = new CookieContainer() };
        using var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(5) };
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(Origin, "/api/desktop/session"));
        request.Headers.Add("X-FBS-Desktop-Token", capability);
        using var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var session = handler.CookieContainer.GetCookies(Origin)["fbs_session"] ?? throw new InvalidDataException("Desktop session unavailable");
        var cookie = core.CookieManager.CreateCookie(session.Name, session.Value, "127.0.0.1", "/");
        cookie.IsHttpOnly = true; cookie.SameSite = CoreWebView2CookieSameSiteKind.Strict;
        core.CookieManager.AddOrUpdateCookie(cookie);
        if (Smoke) {
            var deadline = new System.Windows.Forms.Timer { Interval = 30000 };
            deadline.Tick += (_, _) => { Environment.ExitCode = 2; deadline.Stop(); Close(); };
            deadline.Start();
            core.WebMessageReceived += (_, e) => {
                try {
                    using var data = System.Text.Json.JsonDocument.Parse(e.TryGetWebMessageAsString());
                    bool passed = data.RootElement.GetProperty("authenticated").GetBoolean() && data.RootElement.GetProperty("dashboard").GetBoolean();
                    var args = Environment.GetCommandLineArgs();
                    var reportIndex = Array.IndexOf(args, "--report");
                    if (reportIndex >= 0 && reportIndex + 1 < args.Length)
                        File.WriteAllText(args[reportIndex + 1], System.Text.Json.JsonSerializer.Serialize(new { desktopWindowSmokePassed = passed, authenticatedWithoutPasswordEntry = passed, externalBrowserOpened = false }));
                    Environment.ExitCode = passed ? 0 : 2; deadline.Stop(); Close();
                } catch { Environment.ExitCode = 2; deadline.Stop(); Close(); }
            };
            core.NavigationCompleted += async (_, e) => {
                if (!e.IsSuccess) { Environment.ExitCode = 2; Close(); return; }
                await core.ExecuteScriptAsync("(async()=>{const a=await(await fetch('/api/auth')).json();chrome.webview.postMessage(JSON.stringify({authenticated:a.authenticated,dashboard:document.querySelector('main')!==null}));})()");
            };
        }
        core.Navigate(Origin.AbsoluteUri);
    }
}
