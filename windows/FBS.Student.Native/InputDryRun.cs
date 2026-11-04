using System;
using System.Text.Json;

namespace FBS.Student.Native;

/// <summary>Pure decision layer. NEVER calls WindowsInputAdapter or OS APIs.</summary>
public sealed class InputDryRun
{
    private readonly ControlInputGate gate;
    public InputDryRun(ControlInputGate gate) => this.gate = gate;

    public string Evaluate(JsonElement item, string sessionId, DateTimeOffset now)
    {
        if (!PreviewPayloadPolicy.Valid(item, sessionId, now)) return "rejected-payload";
        if (!item.TryGetProperty("sequence", out var sequence) ||
            !item.TryGetProperty("type", out var type)) return "rejected-payload";
        if (!gate.Accept(sessionId, sequence.GetInt64(), type.GetString() ?? "", now))
            return "rejected-session-or-replay";
        // Explicitly no dispatch to WindowsInputAdapter: this is a dry run.
        return "accepted-preview-only";
    }
}
