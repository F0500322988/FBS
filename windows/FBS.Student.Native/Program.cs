using System;
using System.Drawing;
using System.Windows.Forms;
using System.Net.Http;
using System.Text;
using System.Text.Json;

namespace FBS.Student.Native;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new StudentStatusForm());
    }
}

public sealed class StudentStatusForm : Form
{
    private readonly Label status = new();
    private readonly Button stop = new();
    private readonly Button messagesButton = new();
    private readonly Button broadcastButton = new();
    private TeacherBroadcastForm? broadcastWindow;
    private ScreenPauseController? screenPause;
    private AssistanceController? assistance;
    private readonly NotifyIcon tray = new();
    private readonly HttpClient localClient = new(new HttpClientHandler { UseProxy = false }) { Timeout = TimeSpan.FromSeconds(2) };
    private readonly System.Windows.Forms.Timer consentTimer = new() { Interval = 2000 };
    private string? currentSession;
    private readonly Button approve = new();
    private readonly Button decline = new();
    private readonly Label commandPreview = new();
    private int lastPreviewSequence;
    private DateTimeOffset sessionExpiresAt = DateTimeOffset.MinValue;
    private DateTimeOffset lastAgentContact = DateTimeOffset.MinValue;
    private string? lastConfirmedStopSession;
    private readonly AgentHost agent = new();
    private readonly ControlInputGate inputGate = new();
    private readonly VerifiedPreviewPipeline verifiedPipeline = new();
    private string? locallyStoppedSession;
    private readonly NativePreviewAudit previewAudit = new();
    private readonly WindowsInputAdapter nativeInput = new();
    private readonly SingleStudentExecutionGuard executionGuard = new();
    private readonly LocalConsentLatch localConsent = new();
    private readonly ControlSessionBanner sessionBanner = new();
    private readonly ManagedCommandChannelGuard commandChannel = new();
    // M123: additional dry-run-only guard wired into the student polling path.
    private readonly NativeInputPreflight nativePreflight = new();
    // M143: no enrollment UI is exposed until a trusted local host supplies a
    // credential-backed enrollment service. No default password or auto-provisioning.
    private ManagedEnrollmentCommandService? enrollmentAdministration;
    private readonly EnrollmentStartupGate enrollmentStartup = new();
    private readonly Button pairingTest = new()
    {
        Text = "اختبار هوية الجهاز (LAN)",
        Size = new Size(245, 34),
        Location = new Point(145, 5)
    };

    private readonly Button manageEnrollment = new()
    {
        Text = "إدارة أجهزة المعمل (مسؤول)",
        Size = new Size(250, 35),
        Location = new Point(145, 5),
        Visible = false,
        Enabled = false
    };

    public void ConfigureEnrollmentAdministration(ManagedEnrollmentCommandService service)
    {
        if (InvokeRequired)
        {
            Invoke(() => ConfigureEnrollmentAdministration(service));
            return;
        }
        if (IsDisposed) throw new ObjectDisposedException(nameof(StudentStatusForm));
        if (!enrollmentStartup.TryActivate(service))
            throw new InvalidOperationException("Enrollment administration is already configured or unavailable");
        enrollmentAdministration = service;
        pairingTest.Visible = false;
        manageEnrollment.Visible = true;
        manageEnrollment.Enabled = true;
    }

    private void OpenEnrollmentAdministration()
    {
        // The dialog itself validates administrator credentials on every operation.
        // A configured service is never constructed from untrusted HTTP input.
        if (enrollmentAdministration is null || IsDisposed || !enrollmentStartup.IsActive) return;
        using var dialog = new ManagedEnrollmentAdminForm(enrollmentAdministration);
        dialog.ShowDialog(this);
    }

    private readonly SessionLivenessGuard sessionLiveness = new();
    private readonly StopRaceGuard stopRace = new();
    private readonly PersistentStopLedger persistentStops = new(
        System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "FBS", "Classroom", "student-stopped-sessions.json"));

    private void RecordStoppedSession(string? id)
    {
        stopRace.Stop(id);
        persistentStops.Stop(id);
    }

    private StudentDashboard? dashboard;
    private Form? advancedWindow;
    private bool dashboardBusy;
    private async Task RefreshDashboard()
    {
        if(dashboardBusy||dashboard is null||IsDisposed)return;dashboardBusy=true;
        try{using var data=JsonDocument.Parse(await localClient.GetStringAsync("http://127.0.0.1:4190/status/local"));if(!IsDisposed)dashboard.ApplyConnection(data.RootElement);}
        catch{if(!IsDisposed)dashboard.SetDisconnected();}finally{dashboardBusy=false;}
    }
    private void BuildDashboard(Button filesButton)
    {
        var original=Controls.Cast<Control>().ToArray();var content=new Panel{Dock=DockStyle.Fill,AutoScroll=true,AutoScrollMinSize=new Size(540,495)};Controls.Clear();content.Controls.AddRange(original);
        advancedWindow=new Form{Text="FBS Classroom — إعدادات الطالب",Size=new Size(570,560),StartPosition=FormStartPosition.CenterParent,BackColor=BackColor,ForeColor=ForeColor,RightToLeft=RightToLeft.Yes};advancedWindow.Controls.Add(content);advancedWindow.FormClosing+=(_,e)=>{if(!IsDisposed){e.Cancel=true;advancedWindow.Hide();}};
        dashboard=new StudentDashboard(()=>{advancedWindow.Show(this);advancedWindow.Activate();},()=>StopControl(),()=>messagesButton.PerformClick(),()=>filesButton.PerformClick());Controls.Add(dashboard);ClientSize=new Size(340,422);MinimumSize=new Size(340,450);FormClosed+=(_,_)=>advancedWindow.Dispose();
    }
    private PowerController? power;
    public StudentStatusForm()
    {
        FormClosed += (_, _) => enrollmentStartup.Close();
        Text = "FBS Classroom — جهاز الطالب";
        RightToLeft = RightToLeft.Yes;
        RightToLeftLayout = true;
        ClientSize = new Size(540, 495);
        BackColor = Color.FromArgb(13, 46, 104);
        ForeColor = Color.White;
        Font = new Font("Segoe UI", 12);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        // M128: refuse to start if the disabled native-input adapter fails its safety probe.
        if (!NativeInputSafetyProbe.VerifyDisabled(nativeInput))
            throw new InvalidOperationException("Native input safety preflight failed; student app will not start.");
        status.Text = "برنامج الطالب يعمل — التحكم يحتاج موافقتك؛ يمكنك إيقافه في أي وقت";
        status.Location = new Point(35, 40);
        status.Size = new Size(470, 65);
        status.TextAlign = ContentAlignment.MiddleCenter;
        status.ForeColor = Color.FromArgb(16, 58, 105);
        status.BackColor = Color.FromArgb(225, 246, 234);
        status.Padding = new Padding(10);
        stop.Text = "إيقاف جلسة التحكم";
        stop.Size = new Size(250, 50);
        stop.Location = new Point(145, 170);
        stop.BackColor = Color.FromArgb(190, 42, 55);
        stop.ForeColor = Color.White;
        stop.FlatStyle = FlatStyle.Flat;
        stop.Enabled = assistance is not null;
        stop.Click += (_, _) => StopControl();
        sessionBanner.EmergencyStopRequested += (_, _) => StopControl();
        var identityLabel = new Label
        {
            Text = "جاري إعداد هوية الجهاز...",
            Location = new Point(30, 110),
            Size = new Size(480, 45),
            TextAlign = ContentAlignment.MiddleCenter,
            ForeColor = Color.LightCyan
        };
        try { identityLabel.Text = "معرّف الجهاز: " + DeviceIdentity.GetDeviceId(); }
        catch (Exception ex) { identityLabel.Text = "تعذّر إنشاء هوية الجهاز: " + ex.Message; }
        pairingTest.Click += (_, _) =>
        {
            using var dialog = new StudentPairingTestForm();
            dialog.ShowDialog(this);
        };
        Controls.Add(pairingTest);
        manageEnrollment.Click += (_, _) => OpenEnrollmentAdministration();
        Controls.Add(manageEnrollment);
        Controls.Add(identityLabel);
        Controls.Add(status);
        Controls.Add(stop);
        approve.Text = "موافقة (دون تحكم فعلي)";
        approve.Size = new Size(225, 38); approve.Location = new Point(290, 225);
        approve.Click += async (_, _) => await Decide(true);
        decline.Text = "رفض";
        decline.Size = new Size(225, 38); decline.Location = new Point(30, 225);
        decline.Click += async (_, _) => await Decide(false);
        approve.Visible = decline.Visible = false;
        Controls.Add(approve); Controls.Add(decline);
        commandPreview.Location = new Point(30, 282);
        commandPreview.Size = new Size(480, 55);
        commandPreview.TextAlign = ContentAlignment.MiddleCenter;
        commandPreview.ForeColor = Color.LightCyan;
        commandPreview.Text = "معاينة الأوامر: لا توجد أوامر — لا يتم تنفيذ أي إدخال";
        Controls.Add(commandPreview);
        messagesButton.Text = "رسائل المعلم";
        messagesButton.Location = new Point(145, 345); messagesButton.Size = new Size(250, 38);
        messagesButton.Click += (_, _) => { using var inbox = new TeacherMessagesForm(agent.LocalControlToken); inbox.ShowDialog(this); };
        Controls.Add(messagesButton);
        broadcastButton.Text = "عرض شاشة المعلم";
        broadcastButton.Location = new Point(145, 390); broadcastButton.Size = new Size(250, 38);
        broadcastButton.Click += (_, _) =>
        {
            if (broadcastWindow is null || broadcastWindow.IsDisposed)
                broadcastWindow = new TeacherBroadcastForm(agent.LocalControlToken);
            broadcastWindow.Show(this); broadcastWindow.Activate();
        };
        Controls.Add(broadcastButton);
        var filesButton = new Button { Text = "ملفات المعلم — حفظ بموافقتك", Location = new Point(145, 435), Size = new Size(250, 38) };
        filesButton.Click += (_, _) => { using var files = new TeacherFilesForm(agent.LocalControlToken); files.ShowDialog(this); };
        Controls.Add(filesButton);
        foreach (var button in Controls.OfType<Button>()) { if (button == stop) continue; button.FlatStyle = FlatStyle.Flat; button.BackColor = Color.FromArgb(30, 84, 158); button.ForeColor = Color.White; button.FlatAppearance.BorderSize = 0; }
        BuildDashboard(filesButton);
        localClient.DefaultRequestHeaders.Add("X-FBS-Local-Token", agent.LocalControlToken);
        consentTimer.Tick += async (_, _) =>
        {
            // Local expiry and agent-liveness checks happen before any network operation.
            if (currentSession is not null &&
                (DateTimeOffset.UtcNow >= sessionExpiresAt ||
                 DateTimeOffset.UtcNow - lastAgentContact > TimeSpan.FromSeconds(6) ||
                 SessionSafetyWatchdog.StopReason(DateTimeOffset.UtcNow, sessionExpiresAt,
                    lastAgentContact, studentApproved: true, localStopRequested: false) is not null))
            {
                locallyStoppedSession = currentSession;
                RecordStoppedSession(currentSession);
                localConsent.Close(currentSession);
                ClearPending();
                status.Text = "انتهت الجلسة أو انقطع الاتصال — تم تعطيل التحكم";
            }
            await CheckPending();
            await RefreshDashboard();
        };
        consentTimer.Start();
        tray.Icon = SystemIcons.Information;
        tray.Text = "FBS Classroom — التحكم يحتاج موافقتك";
        tray.Visible = true;
        var connectionMenu = new ContextMenuStrip();
        var editConnection = new ToolStripMenuItem("إعداد عنوان المعلم وبصمة الشهادة");
        editConnection.Click += (_, _) =>
        {
            try
            {
                using var settings = new StudentTeacherConnectionForm(StudentTeacherConnectionSettings.Load());
                if (settings.ShowDialog(this) == DialogResult.OK)
                    MessageBox.Show(this, "حُفظ اختيار الاتصال. أغلق تطبيق الطالب وأعد فتحه لتطبيق التغيير. الاتصال الحالي لا يتغير تلقائيًا.", "FBS Classroom");
            }
            catch (Exception)
            {
                MessageBox.Show(this, "تعذر قراءة إعداد الاتصال. راجع مسؤول المعمل؛ لن يُحذف الإعداد أو يُستبدل تلقائيًا.", "FBS Classroom");
            }
        };
        connectionMenu.Items.Add(editConnection);
        tray.ContextMenuStrip = connectionMenu;
        FormClosed += (_, _) => connectionMenu.Dispose();
        tray.DoubleClick += (_, _) => { Show(); WindowState = FormWindowState.Normal; Activate(); };
        Shown += async (_, _) =>
        {
            status.Text = "جارٍ تشغيل وكيل الطالب — التحكم يحتاج موافقتك؛ يمكنك إيقافه في أي وقت";
            await agent.StartAsync();
            if (!IsDisposed) { status.Text = agent.Status + " — التحكم يحتاج موافقتك؛ يمكنك إيقافه في أي وقت"; screenPause ??= new ScreenPauseController(agent.LocalControlToken); assistance ??= new AssistanceController(agent.LocalControlToken); power ??= new PowerController(agent.LocalControlToken); stop.Enabled = true; }
        };
        FormClosed += (_, _) => { nativeInput.Disable(); inputGate.Deactivate(); screenPause?.Dispose(); assistance?.Dispose(); power?.Dispose(); localConsent.ResetActive(); consentTimer.Stop(); consentTimer.Dispose(); localClient.Dispose(); agent.Dispose(); tray.Dispose(); sessionBanner.Dispose(); };
    }

    private bool polling;
    private async System.Threading.Tasks.Task CheckPending()
    {
        if (polling || IsDisposed || persistentStops.LockedDown) return;
        polling = true;
        var pollGeneration = stopRace.Generation;
        try
        {
            var json = await localClient.GetStringAsync("http://127.0.0.1:4190/control/local");
            // A local stop during the await invalidates this entire HTTP reply.
            if (pollGeneration != stopRace.Generation) return;
            using var doc = JsonDocument.Parse(json);
            lastAgentContact = DateTimeOffset.UtcNow;
            if (doc.RootElement.TryGetProperty("stopReceipt", out var receipt) &&
                receipt.ValueKind == JsonValueKind.Object &&
                receipt.TryGetProperty("state", out var stopState) &&
                stopState.GetString() == "confirmed" &&
                receipt.TryGetProperty("sessionId", out var stoppedSession) &&
                !string.IsNullOrEmpty(stoppedSession.GetString()) &&
                stoppedSession.GetString() != lastConfirmedStopSession)
            {
                lastConfirmedStopSession = stoppedSession.GetString();
                status.Text = "أكد الخادم إيقاف جلسة التحكم";
            }
            if (doc.RootElement.TryGetProperty("broadcastAvailable", out var broadcastAvailable))
            {
                broadcastButton.Text = "شاشة المعلم — العرض يبدأ تلقائيًا";
                if (broadcastAvailable.GetBoolean() && (broadcastWindow is null || broadcastWindow.IsDisposed)) { broadcastWindow = new TeacherBroadcastForm(agent.LocalControlToken); broadcastWindow.Show(); }
            }
            if (doc.RootElement.TryGetProperty("unreadMessages", out var unread))
                messagesButton.Text = "رسائل المعلم (" + unread.GetInt32() + " غير مقروءة)";
            var session = doc.RootElement.GetProperty("session");
            if (session.ValueKind != JsonValueKind.Object ||
                !session.TryGetProperty("sessionId", out var sid) ||
                string.IsNullOrWhiteSpace(sid.GetString()))
            {
                if (currentSession is not null)
                {
                    // A server-side stop must tombstone the session before clearing UI.
                    // Otherwise an older in-flight poll can reintroduce it.
                    locallyStoppedSession = currentSession;
                    RecordStoppedSession(currentSession);
                    localConsent.Close(currentSession);
                    ClearPending();
                }
                return;
            }

            var id = sid.GetString()!;
            // A stale response cannot resurrect a locally stopped or expired session.
            if (persistentStops.WasStopped(id) || stopRace.WasStopped(id) || id == locallyStoppedSession || !localConsent.Observe(id)) return;
            var state = session.TryGetProperty("status", out var stateProp) ? stateProp.GetString() : null;
            long expiryMillis = 0;
            var expiryValid = session.TryGetProperty("expiresAt", out var expiryProp) &&
                expiryProp.TryGetInt64(out expiryMillis);
            var expiry = expiryValid ? DateTimeOffset.FromUnixTimeMilliseconds(expiryMillis) : DateTimeOffset.MinValue;
            if (expiry <= DateTimeOffset.UtcNow || (state != "pending-native-consent" && state != "consented-no-input"))
            {
                // Expired/revoked sessions are never eligible for revival.
                locallyStoppedSession = id;
                RecordStoppedSession(id);
                localConsent.Close(id);
                ClearPending();
                return;
            }
            if (!PollResponseGuard.MayApply(pollGeneration, stopRace.Generation,
                    locallyStoppedSession, id, DateTimeOffset.UtcNow, expiry)) return;
            sessionExpiresAt = expiry;
            if (id != currentSession)
            {
                verifiedPipeline.Stop(); inputGate.Deactivate(); nativeInput.Disable(); executionGuard.Stop(); commandChannel.Revoke(); nativePreflight.Stop(); sessionLiveness.Stop();
                currentSession = id;
                lastPreviewSequence = 0;
                sessionLiveness.Start(id, expiry, DateTimeOffset.UtcNow);
                previewAudit.Reset();
                commandPreview.Text = "معاينة الأوامر: بانتظار جلسة معتمدة";
                status.Text = "طلب جلسة تحكم من المعلم — لا يوجد إدخال فعلي";
                Show(); WindowState = FormWindowState.Normal; Activate();
            }
            approve.Visible = decline.Visible = state == "pending-native-consent";
            stop.Enabled = true;
            sessionBanner.UpdateSession(state ?? "");
            // M118: preflight is armed only after local approval and a visible indicator.
            if (state == "consented-no-input" && localConsent.CanPreview(id) && !commandChannel.IsArmed)
                commandChannel.Arm(id, expiry, DateTimeOffset.UtcNow,
                    enrolled: localConsent.CanPreview(id), localAgentAuthenticated: lastAgentContact > DateTimeOffset.UtcNow.AddSeconds(-6),
                    indicatorVisible: sessionBanner.Visible, studentStopped: id == locallyStoppedSession);
            // Only the teacher-confirmed state can activate the preview gate.
            if (state == "consented-no-input")
            {
                if (!localConsent.CanPreview(id)) { verifiedPipeline.Stop(); inputGate.Deactivate(); nativePreflight.Stop(); return; }
                if (!verifiedPipeline.IsArmed)
                    verifiedPipeline.Begin(id, expiry, DateTimeOffset.UtcNow,
                        studentApproved: true, localOperatorArmed: true, targetDeviceCount: 1);
                verifiedPipeline.Heartbeat(id, DateTimeOffset.UtcNow);
                // This arms only a policy evaluator, never the OS input adapter.
                if (commandChannel.IsArmed && !nativePreflight.IsActive)
                    nativePreflight.Begin(id, expiry, DateTimeOffset.UtcNow,
                        deviceEnrolled: localConsent.CanPreview(id),
                        teacherAuthenticated: commandChannel.IsArmed,
                        localAgentAuthenticated: lastAgentContact > DateTimeOffset.UtcNow.AddSeconds(-6),
                        indicatorVisible: sessionBanner.Visible,
                        operatorAuthorized: localConsent.CanPreview(id));
            }
            else
            {
                verifiedPipeline.Stop();
                inputGate.Deactivate();
                commandChannel.Revoke();
                nativePreflight.Stop();
                sessionLiveness.Stop();
            }

            if (state == "consented-no-input" && localConsent.CanPreview(id) &&
                sessionLiveness.Heartbeat(id, DateTimeOffset.UtcNow) &&
                doc.RootElement.TryGetProperty("previewCommands", out var previews) &&
                previews.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in previews.EnumerateArray())
                {
                    if (!commandChannel.AcceptPreview(item, id, DateTimeOffset.UtcNow,
                        agentConnected: true, indicatorVisible: sessionBanner.Visible,
                        studentStopped: id == locallyStoppedSession)) continue;
                    var previewResult = verifiedPipeline.Preview(item, id, DateTimeOffset.UtcNow,
                        studentApproved: true, studentStopRequested: false);
                    if (previewResult != "accepted-preview-only") continue;
                    var nativeDecision = nativePreflight.Evaluate(item, id, DateTimeOffset.UtcNow,
                        agentConnected: lastAgentContact > DateTimeOffset.UtcNow.AddSeconds(-6),
                        indicatorVisible: sessionBanner.Visible,
                        localStopRequested: id == locallyStoppedSession);
                    if (nativeDecision != "accepted-dry-run-only") continue;
                    if (!item.TryGetProperty("sessionId", out var commandSession) ||
                        commandSession.GetString() != id ||
                        !item.TryGetProperty("sequence", out var seq) ||
                        !seq.TryGetInt64(out var number) ||
                        !item.TryGetProperty("type", out var kind)) continue;
                    var type = kind.GetString() ?? "";
                    // InputDryRun already applied the gate, including sequence replay protection.
                    lastPreviewSequence = (int)Math.Min(number, int.MaxValue);
                    if (item.TryGetProperty("description", out var desc))
                        commandPreview.Text = "معاينة فقط (دون تنفيذ): " + desc.GetString() +
                            $" | مقبول: {verifiedPipeline.Accepted}، مرفوض: {verifiedPipeline.Rejected}";
                }
            }
        }
        catch
        {
            // Fail closed when local agent becomes unreachable, even before timeout.
            if (currentSession is not null)
            {
                locallyStoppedSession = currentSession;
                RecordStoppedSession(currentSession);
                localConsent.Close(currentSession);
                ClearPending();
                status.Text = "تعذر الاتصال بوكيل الطالب — تم تعطيل التحكم";
            }
        }
        finally { polling = false; }
    }
    private async System.Threading.Tasks.Task Decide(bool approved)
    {
        if (currentSession is null) return;
        var id = currentSession;
        var requestGeneration = stopRace.Generation;
        // A decline is effective locally before any network request. A delayed response
        // must never restore consent or an already stopped session.
        if (!approved)
        {
            locallyStoppedSession = id;
            RecordStoppedSession(id);
            localConsent.Close(id);
            ClearPending();
            status.Text = "تم الرفض محليًا — جارٍ إرسال القرار";
        }
        else
        {
            if (!localConsent.BeginApproval(id)) return;
            approve.Visible = decline.Visible = false;
            status.Text = "جارٍ إرسال الموافقة — الإدخال عن بُعد معطل";
        }
        try
        {
            var json = JsonSerializer.Serialize(new { sessionId = id, approved });
            using var response = await localClient.PostAsync("http://127.0.0.1:4190/control/local", new StringContent(json, Encoding.UTF8, "application/json"));
            if (!approved)
            {
                if (currentSession is null && locallyStoppedSession == id)
                    status.Text = response.IsSuccessStatusCode ? "تم إرسال الرفض — الجلسة متوقفة محليًا" : "تم الرفض محليًا؛ تعذر إبلاغ الخادم";
                return;
            }
            // A delayed HTTP success cannot grant consent after expiry or agent silence.
            if (id != currentSession || id == locallyStoppedSession) return;
            if (!stopRace.MayApply(id, requestGeneration, sessionExpiresAt, DateTimeOffset.UtcNow)) return;
            if (DateTimeOffset.UtcNow >= sessionExpiresAt ||
                DateTimeOffset.UtcNow - lastAgentContact > TimeSpan.FromSeconds(6))
            {
                locallyStoppedSession = id;
            RecordStoppedSession(id);
                localConsent.Close(id);
                ClearPending();
                status.Text = "انتهت صلاحية الموافقة أثناء انتظار الخادم — تم إيقاف الجلسة";
                return;
            }
            if (!localConsent.ConfirmApproval(id, response.IsSuccessStatusCode))
            {
                locallyStoppedSession = id;
            RecordStoppedSession(id);
                ClearPending();
                status.Text = "لم يتم تأكيد الموافقة محليًا — الجلسة متوقفة";
                return;
            }
            if (!response.IsSuccessStatusCode)
            {
                locallyStoppedSession = id;
            RecordStoppedSession(id);
                ClearPending();
                status.Text = "تعذر إرسال الموافقة — الجلسة متوقفة";
                return;
            }
            status.Text = "تم إرسال الموافقة — الإدخال عن بُعد معطل";
        }
        catch
        {
            if (approved && id == currentSession)
            {
                localConsent.Close(id);
                locallyStoppedSession = id;
            RecordStoppedSession(id);
                ClearPending();
            }
            if (approved)
            {
                if (currentSession is null && locallyStoppedSession == id)
                    status.Text = "فشل إرسال الموافقة — الجلسة متوقفة";
            }
            else if (currentSession is null && locallyStoppedSession == id)
                status.Text = "تم الرفض محليًا؛ تعذر الاتصال بالخادم";
        }
    }
    private void ClearPending() { verifiedPipeline.Stop(); nativeInput.Disable(); inputGate.Deactivate(); sessionBanner.EndSession(); commandChannel.Revoke(); nativePreflight.Stop(); sessionLiveness.Stop(); sessionExpiresAt = DateTimeOffset.MinValue; currentSession = null; lastPreviewSequence = 0; previewAudit.Reset(); commandPreview.Text = "معاينة الأوامر: لا توجد جلسة نشطة"; approve.Visible = decline.Visible = false; stop.Enabled = assistance is not null; }

    // A future authenticated controller may call this only after validating device enrollment,
    // teacher identity, session authorization, and command channel security.
    // This build intentionally has NO network listener and NO keyboard/mouse injection.
    public void ShowControlRequested(string teacherDisplayName)
    {
        status.Text = $"جلسة تحكم مطلوبة من: {teacherDisplayName}";
        stop.Enabled = true;
        Show(); Activate();
    }

    private async void StopControl()
    {
        assistance?.StopNow();
        var id = currentSession;
        if (id is null) return;
        // Fail closed immediately, regardless of server availability or HTTP outcome.
        locallyStoppedSession = id;
            RecordStoppedSession(id);
        localConsent.Close(id);
        ClearPending();
        status.Text = "تم إرسال طلب الإيقاف محليًا — جارٍ إبلاغ الخادم";
        try
        {
            var json = JsonSerializer.Serialize(new { sessionId = id, stop = true });
            using var response = await localClient.PostAsync("http://127.0.0.1:4190/control/local", new StringContent(json, Encoding.UTF8, "application/json"));
            // A late stop response for session A must not overwrite session B's UI.
            if (currentSession is null && locallyStoppedSession == id)
                status.Text = response.IsSuccessStatusCode
                    ? "تم إيقاف الجلسة محليًا وإرسال طلب الإيقاف (بانتظار تأكيد الخادم)"
                    : "تم إيقاف الجلسة محليًا؛ تعذر إبلاغ الخادم";
        }
        catch
        {
            if (currentSession is null && locallyStoppedSession == id)
                status.Text = "تم إيقاف الجلسة محليًا؛ تعذر الاتصال بالخادم";
        }
    }
}
