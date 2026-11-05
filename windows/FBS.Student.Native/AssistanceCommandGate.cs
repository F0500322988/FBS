namespace FBS.Student.Native;
public sealed class AssistanceCommandGate
{
    private string? id; private bool approved; private double deadline, hardEnd; private long sequence;
    private readonly HashSet<string> closed = new();
    public string? Session => id;
    public bool LocallyApproved => approved;
    public bool Observe(string session, string status, int remaining, bool pinned, bool shareFresh, bool agentConsent, double now)
    {
        if (!Guid.TryParseExact(session, "D", out _) || !pinned || closed.Contains(session) || remaining < 1 || remaining > 6000 || status is not ("requested" or "active")) { Stop(); return false; }
        if (id != session) { Stop(); id = session; hardEnd = now + 120000; approved = false; sequence = 0; }
        deadline = Math.Min(now + remaining, hardEnd);
        if (now >= hardEnd || approved && (!shareFresh || !agentConsent)) { Stop(); return false; }
        return true;
    }
    public bool Approve(string session, double now) { if (id != session || now >= deadline) return false; approved = true; return true; }
    public bool IsLive(double now) => id is not null && now < deadline && now < hardEnd;
    public bool Accept(string session, long number, bool active, bool sharing, bool desktop, double now)
    {
        if (!IsLive(now) || !approved || id != session || !active || !sharing || !desktop || number <= sequence) return false;
        sequence = number; return true;
    }
    public void Stop() { if (id is not null) { closed.Add(id); if (closed.Count > 100) closed.Remove(closed.First(x => x != id)); } id = null; approved = false; deadline = hardEnd = 0; sequence = 0; }
    public static bool ValidText(string? text)
    {
        if (string.IsNullOrEmpty(text) || text.Length > 80) return false;
        for (int i = 0; i < text.Length; i++) { char c = text[i]; if (char.IsControl(c) || c is >= '\u200b' and <= '\u200f' or >= '\u2028' and <= '\u202e' or >= '\u2066' and <= '\u2069') return false; if (char.IsHighSurrogate(c)) { if (++i >= text.Length || !char.IsLowSurrogate(text[i])) return false; } else if (char.IsLowSurrogate(c)) return false; }
        return true;
    }
}
