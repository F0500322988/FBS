using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;

namespace FBS.Student.Native;

/// <summary>
/// M131: restart-safe local stop tombstones. Persistence failure locks out new sessions.
/// This is a local safety ledger, not a substitute for server-side revocation.
/// </summary>
public sealed class PersistentStopLedger
{
    private const int MaxEntries = 4096;
    private readonly string path;
    private readonly HashSet<string> stopped = new(StringComparer.Ordinal);
    public bool LockedDown { get; private set; }

    public PersistentStopLedger(string path)
    {
        this.path = path;
        try
        {
            if (!File.Exists(path)) return;
            var entries = JsonSerializer.Deserialize<string[]>(File.ReadAllText(path))
                ?? throw new InvalidDataException("Invalid stop ledger");
            if (entries.Length > MaxEntries || entries.Any(string.IsNullOrWhiteSpace))
                throw new InvalidDataException("Invalid stop ledger entries");
            foreach (var entry in entries) stopped.Add(entry);
        }
        catch (Exception) { LockedDown = true; }
    }

    public bool WasStopped(string? sessionId) => LockedDown ||
        (!string.IsNullOrWhiteSpace(sessionId) && stopped.Contains(sessionId));

    public bool Stop(string? sessionId)
    {
        if (LockedDown || string.IsNullOrWhiteSpace(sessionId)) return false;
        if (stopped.Contains(sessionId)) return true;
        if (stopped.Count >= MaxEntries) { LockedDown = true; return false; }
        stopped.Add(sessionId);
        try
        {
            var directory = Path.GetDirectoryName(Path.GetFullPath(path))!;
            Directory.CreateDirectory(directory);
            var temporary = path + ".tmp";
            File.WriteAllText(temporary, JsonSerializer.Serialize(stopped.OrderBy(s => s, StringComparer.Ordinal)));
            File.Move(temporary, path, overwrite: true);
            return true;
        }
        catch (Exception) { LockedDown = true; return false; }
    }
}
