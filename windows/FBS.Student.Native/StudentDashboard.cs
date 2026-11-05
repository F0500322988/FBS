using System.Drawing.Drawing2D;
using System.Text.Json;
namespace FBS.Student.Native;
internal sealed class StudentDashboard : UserControl
{
 private readonly Label banner=new(){Text="بانتظار الاتصال بالمعلم",TextAlign=ContentAlignment.MiddleCenter,Font=new Font("Segoe UI",13,FontStyle.Bold)};
 private readonly Label device=new(),lab=new(),state=new();
 private readonly Button settings=new(){Text="⚙ الإعدادات"},stop=new(){Text="إيقاف التحكم"};
 internal string DisplayedConnection=>banner.Text;
 internal StudentDashboard(Action configure,Action stopControl,Action messages,Action files)
 {
  DoubleBuffered=true;Dock=DockStyle.Fill;BackColor=Color.FromArgb(11,49,106);ForeColor=Color.White;Font=new Font("Segoe UI",10);RightToLeft=RightToLeft.Yes;
  foreach(var l in new[]{device,lab,state}){l.AutoSize=false;l.AutoEllipsis=true;l.TextAlign=ContentAlignment.MiddleCenter;l.ForeColor=Color.FromArgb(18,31,51);l.BackColor=Color.White;l.Font=new Font("Segoe UI",10,FontStyle.Bold);Controls.Add(l);}
  device.Text="اسم الجهاز: —";lab.Text="المعمل: —";state.Text="الحالة: انتظار الاتصال";banner.BackColor=Color.FromArgb(229,235,244);banner.ForeColor=Color.FromArgb(64,85,115);Controls.Add(banner);
  foreach(var b in new[]{settings,stop}){b.FlatStyle=FlatStyle.Flat;b.FlatAppearance.BorderSize=0;b.ForeColor=Color.White;b.BackColor=Color.FromArgb(17,66,132);b.Font=new Font("Segoe UI",9);b.Cursor=Cursors.Hand;Controls.Add(b);}settings.Click+=(_,_)=>configure();stop.Click+=(_,_)=>stopControl();
  var menu=new ContextMenuStrip();menu.Items.Add("رسائل المعلم",null,(_,_)=>messages());menu.Items.Add("ملفات المعلم",null,(_,_)=>files());ContextMenuStrip=menu;Disposed+=(_,_)=>menu.Dispose();Resize+=(_,_)=>Arrange();Arrange();
 }
 private void Arrange(){int w=ClientSize.Width;int top=165;banner.SetBounds(28,top,Math.Max(100,w-56),43);device.SetBounds(25,top+62,w-50,26);lab.SetBounds(25,top+95,w-50,26);state.SetBounds(25,top+128,w-50,26);settings.SetBounds(w/2+5,ClientSize.Height-52,w/2-27,30);stop.SetBounds(22,ClientSize.Height-52,w/2-27,30);Invalidate();}
 internal void ApplyConnection(JsonElement value){bool connected=value.TryGetProperty("connected",out var c)&&c.ValueKind==JsonValueKind.True,approved=connected&&value.TryGetProperty("approved",out var a)&&a.ValueKind==JsonValueKind.True;
  string TextValue(string key)=>value.TryGetProperty(key,out var p)&&p.ValueKind==JsonValueKind.String?p.GetString()??"—":"—";
  banner.Text=approved?"✓ متصل بالمعلم":connected?"بانتظار اعتماد المعلم":"غير متصل بالمعلم";banner.BackColor=approved?Color.FromArgb(201,242,215):connected?Color.FromArgb(255,235,188):Color.FromArgb(228,234,242);banner.ForeColor=approved?Color.FromArgb(22,93,45):connected?Color.FromArgb(128,82,10):Color.FromArgb(70,87,110);
  device.Text="اسم الجهاز: "+TextValue("deviceId");lab.Text="المعمل: "+TextValue("labName");state.Text="الحالة: "+(approved?"جاهز":connected?"بانتظار الاعتماد":"غير متصل");}
 internal void SetDisconnected(){banner.Text="غير متصل بالمعلم";banner.BackColor=Color.FromArgb(228,234,242);banner.ForeColor=Color.FromArgb(70,87,110);state.Text="الحالة: غير متصل";}
 protected override void OnPaint(PaintEventArgs e){base.OnPaint(e);var g=e.Graphics;g.SmoothingMode=SmoothingMode.AntiAlias;using var gradient=new LinearGradientBrush(ClientRectangle,Color.FromArgb(13,68,143),Color.FromArgb(7,30,68),45);g.FillRectangle(gradient,ClientRectangle);float cx=Width/2f;using var white=new SolidBrush(Color.White);g.FillPolygon(white,new[]{new PointF(cx-35,42),new PointF(cx,29),new PointF(cx+35,42),new PointF(cx,56)});g.FillPolygon(white,new[]{new PointF(cx-23,53),new PointF(cx-23,68),new PointF(cx,77),new PointF(cx+23,68),new PointF(cx+23,53),new PointF(cx,63)});using var pen=new Pen(Color.White,3);g.DrawLine(pen,cx+31,44,cx+31,68);using var font=new Font("Segoe UI",24,FontStyle.Bold);var text="FBS Classroom";var size=g.MeasureString(text,font);g.DrawString(text,font,white,(Width-size.Width)/2,89);using var sub=new Font("Segoe UI",9);var st="جهاز الطالب";var ss=g.MeasureString(st,sub);g.DrawString(st,sub,white,(Width-ss.Width)/2,133);using var path=Rounded(new RectangleF(14,153,Width-28,195),12);g.FillPath(white,path);using var footer=new Font("Segoe UI",9);var fs=g.MeasureString(st,footer);g.DrawString(st,footer,white,(Width-fs.Width)/2,Height-21);}
 private static GraphicsPath Rounded(RectangleF r,float radius){var p=new GraphicsPath();float d=radius*2;p.AddArc(r.Left,r.Top,d,d,180,90);p.AddArc(r.Right-d,r.Top,d,d,270,90);p.AddArc(r.Right-d,r.Bottom-d,d,d,0,90);p.AddArc(r.Left,r.Bottom-d,d,d,90,90);p.CloseFigure();return p;}
}
