namespace FBS.Student.Native;
public sealed class PowerCommandGate
{
    private readonly HashSet<string> seen = new(); private string? current; private double deadline;
    public static bool ValidAction(string action) => action is "shutdown" or "restart" or "sleep";
    public bool Begin(string id, string action, int remainingMs, bool pinnedSupported, double now)
    {
        if (!pinnedSupported || !Guid.TryParseExact(id,"D",out _) || !ValidAction(action) || remainingMs < 3000 || remainingMs > 30000 || seen.Contains(id)) return false;
        seen.Add(id); if(seen.Count>100)seen.Remove(seen.First(x=>x!=id)); current=id;deadline=now+remainingMs;return true;
    }
    public bool Claim(string id,double now){if(current!=id||now>=deadline)return false;current=null;return true;}
    public void Cancel(){current=null;deadline=0;}
}
