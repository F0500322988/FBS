using System;
using System.Drawing;
using System.Windows.Forms;

namespace FBS.Student.Native;

// Visible student-side session indicator. It never enables input injection.
public sealed class ControlSessionBanner : Form
{
    private readonly Label message = new();
    private readonly Button emergencyStop = new();
    public event EventHandler? EmergencyStopRequested;

    public ControlSessionBanner()
    {
        Text = "FBS Classroom — حالة جلسة المعلم";
        RightToLeft = RightToLeft.Yes;
        RightToLeftLayout = true;
        TopMost = true;
        ShowInTaskbar = true;
        FormBorderStyle = FormBorderStyle.FixedToolWindow;
        MaximizeBox = false;
        MinimizeBox = false;
        ControlBox = false; // student must use Stop, not hide the indicator
        ClientSize = new Size(490, 112);
        BackColor = Color.FromArgb(22, 44, 75);
        ForeColor = Color.White;
        message.SetBounds(12, 10, 466, 42);
        message.TextAlign = ContentAlignment.MiddleCenter;
        message.Font = new Font("Segoe UI", 10, FontStyle.Bold);
        emergencyStop.Text = "إيقاف الجلسة فورًا";
        emergencyStop.SetBounds(130, 60, 230, 42);
        emergencyStop.BackColor = Color.FromArgb(190, 42, 55);
        emergencyStop.ForeColor = Color.White;
        emergencyStop.FlatStyle = FlatStyle.Flat;
        emergencyStop.Click += (_, _) => EmergencyStopRequested?.Invoke(this, EventArgs.Empty);
        Controls.Add(message);
        Controls.Add(emergencyStop);
    }

    public void UpdateSession(string state)
    {
        message.Text = state switch
        {
            "pending-native-consent" => "طلب جلسة من المعلم — التحكم الفعلي غير مفعل",
            "consented-no-input" => "جلسة معاينة مع المعلم — لا يُنفذ إدخال بالفأرة أو لوحة المفاتيح",
            _ => "جلسة معلم نشطة — الإدخال عن بُعد غير مفعل"
        };
        if (!Visible) Show();
        BringToFront();
    }

    public void EndSession() { if (Visible) Hide(); }
}
