using System;
using System.IO;
using System.Net;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using FBS.Student.Native;

namespace FBS.Teacher.Launcher;

/// <summary>Explicit teacher-side identity-only LAN test. Never dispatches classroom commands.</summary>
internal sealed class TeacherPairingAuditForm : Form
{
    private readonly TextBox adminDirectory = new() { Width = 410, ReadOnly = true };
    private readonly TextBox pfxPath = new() { Width = 410, ReadOnly = true };
    private readonly TextBox pfxPassword = new() { Width = 410, UseSystemPasswordChar = true };
    private readonly TextBox bindIp = new() { Width = 200, Text = "127.0.0.1" };
    private readonly NumericUpDown port = new() { Minimum = 1024, Maximum = 65535, Value = 47443 };
    private readonly Label status = new() { AutoSize = true, MaximumSize = new System.Drawing.Size(470, 0), Text = "متوقف — لا توجد اتصالات" };
    private readonly Label counts = new() { AutoSize = true, Text = "تم التحقق: 0 | مرفوض: 0" };
    private readonly ListBox auditLog = new() { Width = 470, Height = 130, RightToLeft = RightToLeft.Yes };
    private readonly DataGridView roster = new() { Width = 470, Height = 165, ReadOnly = true,
        AllowUserToAddRows = false, AllowUserToDeleteRows = false, AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
        RowHeadersVisible = false, SelectionMode = DataGridViewSelectionMode.FullRowSelect };
    private readonly Button refreshRoster = new() { Text = "تحديث قائمة الأجهزة المسجلة", AutoSize = true };
    private readonly System.Windows.Forms.Timer presenceTimer = new() { Interval = 5000 };
    private static readonly TimeSpan PresenceWindow = TimeSpan.FromSeconds(30);
    private readonly Dictionary<string, DateTimeOffset> lastVerified = new(StringComparer.Ordinal);
    private readonly Dictionary<string, HashSet<Guid>> activePresence = new(StringComparer.Ordinal);
    private PersistentManagedEnrollment? activeRegistry;
    private readonly CheckBox persistent = new() { Text = "استقبال جلسات متابعة TLS المستمرة (اختياري؛ دون أوامر تحكم)", AutoSize = true };
    private readonly Button start = new() { Text = "بدء اختبار الهوية فقط", AutoSize = true };
    private readonly Button stop = new() { Text = "إيقاف الاستماع", AutoSize = true, Enabled = false };
    private CancellationTokenSource? cancellation;
    private TeacherPinnedTlsListener? listener;
    private Task? runTask;

    internal TeacherPairingAuditForm()
    {
        Text = "FBS Classroom — اختبار هوية الأجهزة عبر TLS";
        Width = 560; Height = 750; StartPosition = FormStartPosition.CenterParent;
        RightToLeft = RightToLeft.Yes; RightToLeftLayout = true;
        var layout = new FlowLayoutPanel { Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown,
            WrapContents = false, AutoScroll = true, Padding = new Padding(14) };
        layout.Controls.Add(new Label { AutoSize = true, Text = "اختبار الهوية فقط: لا يتم إرسال أوامر إلى أجهزة الطلاب" });
        layout.Controls.Add(new Label { AutoSize = true, Text = "مجلد المسؤول المشفر (حساب Windows نفسه)" });
        layout.Controls.Add(adminDirectory);
        var chooseAdmin = new Button { Text = "اختيار مجلد المسؤول", AutoSize = true };
        chooseAdmin.Click += (_, _) => { using var d = new FolderBrowserDialog(); if (d.ShowDialog(this) == DialogResult.OK) adminDirectory.Text = d.SelectedPath; };
        layout.Controls.Add(chooseAdmin);
        layout.Controls.Add(new Label { AutoSize = true, Text = "شهادة الخادم PFX مع المفتاح الخاص" });
        layout.Controls.Add(pfxPath);
        var chooseCert = new Button { Text = "اختيار شهادة PFX", AutoSize = true };
        chooseCert.Click += (_, _) => { using var d = new OpenFileDialog { Filter = "PFX certificate (*.pfx)|*.pfx" }; if (d.ShowDialog(this) == DialogResult.OK) pfxPath.Text = d.FileName; };
        layout.Controls.Add(chooseCert);
        layout.Controls.Add(new Label { AutoSize = true, Text = "كلمة مرور ملف PFX" });
        layout.Controls.Add(pfxPassword);
        layout.Controls.Add(new Label { AutoSize = true, Text = "عنوان الاستماع المحدد (127.0.0.1 للاختبار المحلي)" });
        layout.Controls.Add(bindIp);
        layout.Controls.Add(new Label { AutoSize = true, Text = "المنفذ" });
        layout.Controls.Add(port);
        start.Click += async (_, _) => await StartAsync();
        stop.Click += async (_, _) => await StopAsync();
        layout.Controls.Add(persistent);
        layout.Controls.Add(start); layout.Controls.Add(stop); layout.Controls.Add(status);
        layout.Controls.Add(counts); layout.Controls.Add(auditLog);
        roster.Columns.Add("Device", "معرّف الجهاز");
        roster.Columns.Add("Enrollment", "حالة التسجيل");
        roster.Columns.Add("LastProof", "آخر تحقق ناجح");
        roster.Columns.Add("Presence", "حالة الاتصال / التحقق");
        presenceTimer.Tick += (_, _) => RefreshRoster();
        presenceTimer.Start();
        layout.Controls.Add(new Label { AutoSize = true, Text = "الحالة حديثة عند وصول إثبات هوية خلال 30 ثانية؛ ليس اتصالًا مباشرًا أو جلسة تحكم أو اتصال TLS مستمرًا (في الوضع الدوري)." });
        layout.Controls.Add(new Label { AutoSize = true, Text = "في الوضع المستمر: حالة متصل تعني جلسة مصادَق عليها لم يُبلّغ عن إغلاقها؛ ليست صلاحية تحكم ولا ضمانًا لاتصال فوري." });
        refreshRoster.Click += (_, _) => RefreshRoster();
        layout.Controls.Add(refreshRoster);
        layout.Controls.Add(roster);
        Controls.Add(layout);
        FormClosing += (_, _) => { presenceTimer.Stop(); presenceTimer.Dispose(); cancellation?.Cancel(); };
    }

    private async Task StartAsync()
    {
        start.Enabled = false;
        try
        {
            if (!Directory.Exists(adminDirectory.Text)) throw new InvalidDataException("مجلد المسؤول غير موجود");
            AdministratorDirectoryAcl.Validate(adminDirectory.Text);
            if (!IPAddress.TryParse(bindIp.Text.Trim(), out var ip) || IPAddress.Any.Equals(ip) || IPAddress.IPv6Any.Equals(ip))
                throw new InvalidDataException("حدد عنوان IP محليًا صريحًا، وليس عنوان جميع الواجهات");
            if (!File.Exists(pfxPath.Text)) throw new FileNotFoundException("ملف الشهادة غير موجود");
            var vault = Path.Combine(adminDirectory.Text, "admin-credentials.dpapi");
            var registryPath = Path.Combine(adminDirectory.Text, "managed-devices.enc");
            var lockoutPath = Path.Combine(adminDirectory.Text, "admin-lockout.enc");
            foreach (var file in new[] { vault, registryPath, lockoutPath })
                if (!File.Exists(file) || (File.GetAttributes(file) & FileAttributes.ReparsePoint) != 0 || new FileInfo(file).Length == 0)
                    throw new InvalidDataException("ملفات المسؤول غير مكتملة أو غير آمنة");
            // Validate the complete administrator state before accepting connections.
            _ = WindowsEnrollmentBootstrap.OpenExisting(adminDirectory.Text);
            var (salt, verifier, registryKey, lockoutKey) = WindowsAdminCredentialVault.OpenExisting(vault);
            PersistentManagedEnrollment registry;
            try { registry = new PersistentManagedEnrollment(registryPath, registryKey); }
            finally
            {
                CryptographicOperations.ZeroMemory(salt);
                CryptographicOperations.ZeroMemory(verifier);
                CryptographicOperations.ZeroMemory(registryKey);
                CryptographicOperations.ZeroMemory(lockoutKey);
            }
            if (registry.IsLocked) throw new InvalidDataException("سجل الأجهزة مقفل");
            activeRegistry = registry;
            lastVerified.Clear();
            activePresence.Clear();
            RefreshRoster();
            using var certificate = new X509Certificate2(pfxPath.Text, pfxPassword.Text,
                X509KeyStorageFlags.EphemeralKeySet);
            listener = new TeacherPinnedTlsListener(ip, (int)port.Value, certificate);
            counts.Text = "تم التحقق: 0 | مرفوض: 0";
            auditLog.Items.Clear();
            listener.PairingAuditCompleted += OnPairingAuditCompleted;
            cancellation = new CancellationTokenSource();
            if (persistent.Checked)
            {
                listener.PresenceHeartbeatReceived += OnPresenceHeartbeatReceived;
                listener.PresenceSessionChanged += OnPresenceSessionChanged;
                runTask = listener.RunPresenceAsync(registry, cancellation.Token);
            }
            else runTask = listener.RunPairingAuditAsync(registry, cancellation.Token);
            persistent.Enabled = false;
            stop.Enabled = true;
            status.Text = $"الاستماع جارٍ على {ip}:{port.Value} — التحقق من الهوية فقط";
            _ = ObserveRunAsync(runTask);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or ArgumentException or
            CryptographicException or InvalidOperationException or PlatformNotSupportedException)
        {
            status.Text = "تعذر بدء اختبار الهوية: " + ex.Message;
            await StopAsync();
        }
        finally { if (cancellation is null) start.Enabled = true; }
    }

    private void OnPresenceSessionChanged(string deviceId, Guid sessionId, bool connected)
    {
        if (IsDisposed || !IsHandleCreated) return;
        try
        {
            BeginInvoke((Action)(() =>
            {
                if (IsDisposed || cancellation is null) return;
                if (!activePresence.TryGetValue(deviceId, out var sessions))
                {
                    if (!connected) return;
                    sessions = new HashSet<Guid>();
                    activePresence[deviceId] = sessions;
                }
                if (connected) sessions.Add(sessionId);
                else
                {
                    sessions.Remove(sessionId);
                    if (sessions.Count == 0) activePresence.Remove(deviceId);
                }
                RefreshRoster();
            }));
        }
        catch (InvalidOperationException) { /* form closing */ }
    }

    private void OnPresenceHeartbeatReceived(string deviceId, DateTimeOffset timestamp)
    {
        if (IsDisposed || !IsHandleCreated) return;
        try
        {
            BeginInvoke((Action)(() =>
            {
                if (IsDisposed || cancellation is null) return;
                lastVerified[deviceId] = timestamp;
                RefreshRoster();
            }));
        }
        catch (InvalidOperationException) { /* form closing */ }
    }

    private void OnPairingAuditCompleted(PairingAuditOutcome outcome)
    {
        if (IsDisposed || !IsHandleCreated) return;
        try
        {
            BeginInvoke((Action)(() =>
            {
                if (IsDisposed) return;
                if (outcome.Accepted && outcome.DeviceId is not null)
                    lastVerified[outcome.DeviceId] = outcome.Timestamp;
                RefreshRoster();
                var current = listener?.AuditCounts;
                if (current is not null)
                    counts.Text = $"تم التحقق: {current.Value.Accepted} | مرفوض: {current.Value.Rejected}";
                // Avoid storing identifiers, IPs, signatures or credentials in UI history.
                auditLog.Items.Insert(0, $"{outcome.Timestamp:HH:mm:ss} — " +
                    (outcome.Accepted ? "تم التحقق من الهوية" : "فشل التحقق أو انقطع الاتصال"));
                while (auditLog.Items.Count > 40) auditLog.Items.RemoveAt(auditLog.Items.Count - 1);
            }));
        }
        catch (InvalidOperationException) { /* form closing */ }
    }

    private void RefreshRoster()
    {
        roster.Rows.Clear();
        if (activeRegistry is null) return;
        try
        {
            var snapshot = activeRegistry.GetRosterSnapshot();
            foreach (var id in snapshot.Enrolled)
                {
                    bool hasProof = lastVerified.TryGetValue(id, out var seen);
                    bool fresh = hasProof && DateTimeOffset.UtcNow - seen <= PresenceWindow;
                    bool live = activePresence.TryGetValue(id, out var sessions) && sessions.Count > 0;
                    roster.Rows.Add(id, "مسجل", hasProof
                        ? seen.ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss") : "لم يُتحقق خلال هذه الجلسة",
                        live && fresh ? "متصل — نبضات حديثة" :
                        live ? "جلسة مفتوحة — انتظار نبضة" :
                        fresh ? "انتهت الجلسة — تحقق حديث" : "غير متصل / لا يوجد تحقق حديث");
                }
            foreach (var id in snapshot.Revoked)
                roster.Rows.Add(id, "ملغى", "—", "غير مصرح");
        }
        catch (InvalidOperationException)
        {
            activeRegistry = null;
            roster.Rows.Clear();
            status.Text = "تعذر قراءة سجل الأجهزة";
        }
    }

    private async Task ObserveRunAsync(Task running)
    {
        try { await running; }
        catch (Exception ex) when (ex is IOException or System.Net.Sockets.SocketException or ObjectDisposedException)
        { if (!IsDisposed) status.Text = "توقف الاستماع: " + ex.Message; }
        finally { if (!IsDisposed) await StopAsync(); }
    }

    private async Task StopAsync()
    {
        cancellation?.Cancel();
        var oldListener = listener;
        listener = null;
        if (oldListener is not null) await oldListener.DisposeAsync();
        cancellation?.Dispose();
        cancellation = null;
        activeRegistry = null;
        activePresence.Clear();
        lastVerified.Clear();
        roster.Rows.Clear();
        stop.Enabled = false;
        persistent.Enabled = true;
        start.Enabled = true;
        if (!IsDisposed) status.Text = "متوقف — لا توجد جلسة تحكم";
    }
}
