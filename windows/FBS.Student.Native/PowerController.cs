using System.Diagnostics;
using System.Net.Http;
using System.Text;
using System.Text.Json;
namespace FBS.Student.Native;
internal sealed class PowerController : IDisposable
{
 private readonly HttpClient client=new(new HttpClientHandler{UseProxy=false}){Timeout=TimeSpan.FromSeconds(2)};
 private readonly System.Windows.Forms.Timer timer=new(){Interval=700};private readonly PowerCommandGate gate=new();private bool busy,disposed;
 private static double Now=>Stopwatch.GetTimestamp()*1000d/Stopwatch.Frequency;
 public PowerController(string token){client.DefaultRequestHeaders.Add("X-FBS-Local-Token",token);timer.Tick+=async(_,_)=>{if(!busy&&!disposed)await Poll();};timer.Start();}
 private async Task<bool> Receipt(string id,string state){try{using var b=new StringContent(JsonSerializer.Serialize(new{requestId=id,state}),Encoding.UTF8,"application/json");using var r=await client.PostAsync("http://127.0.0.1:4190/power/local",b);return r.IsSuccessStatusCode;}catch{return false;}}
 private async Task Poll(){busy=true;string? id=null;try{
  using var d=JsonDocument.Parse(await client.GetStringAsync("http://127.0.0.1:4190/power/local"));if(disposed)return;var root=d.RootElement;var p=root.GetProperty("power");if(p.ValueKind!=JsonValueKind.Object)return;
  id=p.GetProperty("id").GetString()!;string action=p.GetProperty("action").GetString()!;
  if(!gate.Begin(id,action,p.GetProperty("remainingMs").GetInt32(),root.GetProperty("supported").GetBoolean(),Now))return;
  if(!await Receipt(id,"received")||disposed||!gate.Claim(id,Now)){gate.Cancel();return;}
  bool submitted=false;
  if(action=="sleep")submitted=Application.SetSuspendState(PowerState.Suspend,false,false);
  else {var info=new ProcessStartInfo(Path.Combine(Environment.SystemDirectory,"shutdown.exe")){UseShellExecute=false,CreateNoWindow=true};info.ArgumentList.Add(action=="shutdown"?"/s":"/r");info.ArgumentList.Add("/t");info.ArgumentList.Add("0");using var process=Process.Start(info);if(process is not null){using var limit=new CancellationTokenSource(TimeSpan.FromSeconds(8));await process.WaitForExitAsync(limit.Token);submitted=process.ExitCode==0;}}
  await Receipt(id,submitted?"submitted":"rejected");
 }catch{gate.Cancel();if(id is not null&&!disposed)await Receipt(id,"rejected");}finally{busy=false;}}
 public void Dispose(){disposed=true;timer.Stop();timer.Dispose();gate.Cancel();client.Dispose();}
}
