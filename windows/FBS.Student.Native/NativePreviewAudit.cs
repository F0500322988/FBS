using System;
using System.Collections.Generic;

namespace FBS.Student.Native;

// Bounded diagnostic log. No keystrokes, coordinates, tokens or student identity are stored.
public sealed class NativePreviewAudit
{
    private readonly Queue<string> entries = new();
    public int Accepted { get; private set; }
    public int Rejected { get; private set; }
    public int Count => entries.Count;
    public IReadOnlyCollection<string> Entries => entries.ToArray();

    public void Record(string result)
    {
        if (result == "accepted-preview-only") Accepted++;
        else Rejected++;
        var safe = result switch
        {
            "accepted-preview-only" => "accepted-preview-only",
            "rejected-payload" => "rejected-payload",
            "rejected-session-or-replay" => "rejected-session-or-replay",
            _ => "rejected-unknown"
        };
        entries.Enqueue(safe);
        while (entries.Count > 30) entries.Dequeue();
    }
    public void Reset() { entries.Clear(); Accepted = 0; Rejected = 0; }
}
