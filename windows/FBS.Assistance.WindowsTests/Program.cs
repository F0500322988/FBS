using System.Runtime.InteropServices;
using FBS.Student.Native;
internal static class Program
{
 [DllImport("user32.dll")]private static extern IntPtr GetForegroundWindow();
 [STAThread]private static void Main(){Application.EnableVisualStyles();using var form=new Form{Text="FBS owned assistance input fixture",Size=new Size(640,300),StartPosition=FormStartPosition.CenterScreen,TopMost=true};var text=new TextBox{Multiline=true,Dock=DockStyle.Fill};form.Controls.Add(text);using var timer=new System.Windows.Forms.Timer{Interval=100};int phase=0,ticks=0,passed=0;Point start=default;const string expected="FBS مرحبا 42 😀";
 void Check(bool ok,string name){if(!ok)throw new Exception(name);passed++;Console.WriteLine("PASS: "+name);}
 timer.Tick+=(_,_)=>{try{if(++ticks>100)throw new TimeoutException("owned input fixture did not receive expected input");if(phase==0){form.Activate();text.Focus();if(GetForegroundWindow()!=form.Handle||!text.Focused)return;Check(AssistanceInput.DesktopAvailable(),"default desktop is available for owned fixture");start=Cursor.Position;Check(AssistanceInput.Move(10,0),"native relative move accepted by OS");phase=1;}
 else if(phase==1){Check(Cursor.Position!=start,"owned CI pointer movement observed");Check(GetForegroundWindow()==form.Handle&&text.Focused,"typing target is owned fixture");Check(AssistanceInput.Text(expected),"native Unicode text accepted by OS");phase=2;}
 else if(phase==2&&text.Text==expected){Check(text.Text==expected,"owned textbox received exact Arabic and ASCII text");Check(!AssistanceInput.Text("x\n"),"line breaks rejected before OS input");Check(!AssistanceInput.Move(101,0),"oversized move rejected before OS input");timer.Stop();Console.WriteLine($"Assistance owned OS input checks: {passed} passed. No third-party application targeted.");form.Close();}}
 catch(Exception ex){timer.Stop();Console.Error.WriteLine("FAIL: "+ex.GetType().Name+" "+ex.Message);Environment.ExitCode=1;form.Close();}};form.Shown+=(_,_)=>timer.Start();Application.Run(form);}
}
