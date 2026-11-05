using FBS.Student.Native;
int passed=0;void Check(bool ok,string name){if(!ok)throw new Exception("FAIL: "+name);passed++;Console.WriteLine("PASS: "+name);}
var gate=new AssistanceCommandGate();var id=Guid.NewGuid().ToString();
Check(gate.Observe(id,"requested",6000,true,true,false,0),"pinned request observed");
Check(!gate.Accept(id,1,true,true,true,1),"teacher status cannot grant local consent");Check(gate.Approve(id,1),"explicit local consent");
Check(gate.Observe(id,"active",6000,true,true,true,2),"active confirmed consent");Check(gate.Accept(id,1,true,true,true,3),"fresh verified command accepted");Check(!gate.Accept(id,1,true,true,true,4),"sequence replay denied");Check(!gate.Accept(id,2,true,false,true,4),"stale screen rejected");Check(!gate.Accept(id,2,true,true,false,4),"unavailable desktop rejected");
Check(!gate.Observe(id,"active",6000,true,false,true,5),"sharing loss closes gate");Check(!gate.Observe(id,"active",6000,true,true,true,6),"stopped session cannot rearm");
var next=Guid.NewGuid().ToString();Check(gate.Observe(next,"requested",6000,true,true,false,10),"new request can be observed");Check(gate.Approve(next,11),"new request requires fresh local approval");Check(!gate.IsLive(6010),"local lease expires independent of request");
foreach(var text in new[]{"a\n","\ud800","x\u202ey",new string('x',81)})Check(!AssistanceCommandGate.ValidText(text),"invalid plain text rejected");Check(AssistanceCommandGate.ValidText("مرحبا 😀"),"well formed Arabic and Unicode accepted");
Console.WriteLine($"Assistance gate checks: {passed} passed. No OS input emitted.");
