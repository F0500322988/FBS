using System;
using System.Drawing;
using System.Security.Cryptography;
using System.Threading;
using System.Windows.Forms;

namespace FBS.Student.Native;

/// <summary>M157 manual, student-visible identity-only LAN test. No commands, remote input,
/// background reconnect, private-key export, or automatic network activity.</summary>
public sealed class StudentPairingTestForm : Form
{
    private readonly TextBox host = new() { Width = 300, PlaceholderText = "teacher.lab.example" };
    private readonly NumericUpDown port = new() { Minimum = 1, Maximum = 65535, Value = 47443, Width = 100 };
    private readonly TextBox pin = new() { Width = 430, MaxLength = 64, PlaceholderText = "64 hex characters (SHA-256 certificate fingerprint)" };
    private readonly Button start = new() { Text = "اختبار الهوية", Width = 150 };
    private readonly CheckBox persistent = new() { Text = "جلسة اتصال مستمرة وآمنة (اختياري، دون تحكم عن بُعد)", AutoSize = true };
    private readonly CheckBox periodic = new() { Text = "متابعة حالة الجهاز كل 10 ثوانٍ (اختياري)", AutoSize = true };
    private readonly Button cancel = new() { Text = "إيقاف الاختبار", Width = 150, Enabled = false };
    private readonly Label result = new() { AutoSize = false, Width = 460, Height = 65, Text = "لم يبدأ الاختبار. لا يوجد تحكم عن بُعد." };
    private CancellationTokenSource? running;

    public StudentPairingTestForm()
    {
        Text = "FBS Classroom — اختبار هوية جهاز الطالب";
        RightToLeft = RightToLeft.Yes;
        RightToLeftLayout = true;
        ClientSize = new Size(530, 355);
        Font = new Font("Segoe UI", 10);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        var layout = new FlowLayoutPanel { Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown,
            WrapContents = false, Padding = new Padding(18), AutoScroll = true };
        layout.Controls.Add(new Label { Text = "اسم خادم المعلم (مطابق لشهادة TLS)", AutoSize = true });
        layout.Controls.Add(host);
        layout.Controls.Add(new Label { Text = "المنفذ", AutoSize = true });
        layout.Controls.Add(port);
        layout.Controls.Add(new Label { Text = "بصمة SHA-256 لشهادة المعلم (تُستلم من المسؤول بشكل موثوق)", AutoSize = true });
        layout.Controls.Add(pin);
        var actions = new FlowLayoutPanel { AutoSize = true, Width = 465 };
        actions.Controls.Add(start);
        actions.Controls.Add(cancel);
        layout.Controls.Add(periodic);
        layout.Controls.Add(persistent);
        persistent.CheckedChanged += (_, _) => { if (persistent.Checked) periodic.Checked = false; };
        periodic.CheckedChanged += (_, _) => { if (periodic.Checked) persistent.Checked = false; };
        layout.Controls.Add(actions);
        layout.Controls.Add(result);
        Controls.Add(layout);
        start.Click += async (_, _) => await RunTestAsync();
        cancel.Click += (_, _) => running?.Cancel();
        FormClosing += (_, _) => running?.Cancel();
    }

    private async System.Threading.Tasks.Task RunTestAsync()
    {
        if (running is not null) return;
        if (pin.Text.Length != 64 || !pin.Text.All(Uri.IsHexDigit))
        {
            result.Text = "خطأ: أدخل بصمة شهادة صحيحة مكونة من 64 رمزًا سداسيًا.";
            return;
        }
        var fingerprint = Convert.FromHexString(pin.Text);
        running = new CancellationTokenSource();
        start.Enabled = false;
        periodic.Enabled = false;
        persistent.Enabled = false;
        cancel.Enabled = true;
        result.Text = "جارٍ اختبار هوية الجهاز فقط...";
        try
        {
            // The identity is tied to the same existing non-exportable Windows CNG key.
            string id = DeviceIdentity.GetDeviceId();
            using RSA signingKey = DeviceIdentity.OpenExistingSigningKey();
            // M162: explicitly opt-in periodic identity proofs. Each TLS connection
            // is short-lived and authenticated; no classroom commands are accepted.
            bool repeat = periodic.Checked;
            if (persistent.Checked)
            {
                result.Text = "جلسة متابعة TLS مستمرة — اضغط إيقاف لإنهائها، دون تحكم عن بُعد.";
                await PinnedLanPairingClient.RunPresenceAsync(host.Text.Trim(), (int)port.Value, fingerprint, id, signingKey, running.Token);
                result.Text = "انتهت جلسة المتابعة الآمنة.";
                return;
            }
            do
            {
                bool verified = await PinnedLanPairingClient.ProveIdentityAsync(
                    host.Text.Trim(), (int)port.Value, fingerprint, id, signingKey, running.Token);
                if (!IsDisposed) result.Text = verified
                    ? (repeat ? "تم التحقق — متابعة الهوية مفعّلة، دون تحكم عن بُعد." : "نجح التحقق من هوية الجهاز. لم تُمنح صلاحيات تحكم.")
                    : "رفض خادم المعلم التحقق من هوية الجهاز.";
                // Failed proofs must not trigger repeated credential attempts.
                if (!verified || !repeat) break;
                await System.Threading.Tasks.Task.Delay(TimeSpan.FromSeconds(10), running.Token);
            } while (!running.Token.IsCancellationRequested);
        }
        catch (OperationCanceledException) { if (!IsDisposed) result.Text = "تم إيقاف الاختبار."; }
        catch (Exception ex) { if (!IsDisposed) result.Text = "فشل اختبار الاتصال: " + ex.GetType().Name; }
        finally
        {
            CryptographicOperations.ZeroMemory(fingerprint);
            running.Dispose();
            running = null;
            if (!IsDisposed) { start.Enabled = true; periodic.Enabled = true; persistent.Enabled = true; cancel.Enabled = false; }
        }
    }
}
