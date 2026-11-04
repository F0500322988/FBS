using System;
using System.Text.Json;
namespace FBS.Student.Native;
public static class PreviewPayloadPolicy
{
    public static bool Valid(JsonElement item, string sessionId, DateTimeOffset now)
    {
        if (!item.TryGetProperty("sessionId", out var sid) || sid.GetString() != sessionId ||
            !item.TryGetProperty("sequence", out var seq) || !seq.TryGetInt64(out var number) || number < 1 ||
            !item.TryGetProperty("at", out var at) || !at.TryGetInt64(out var timestamp)) return false;
        var age = now.ToUnixTimeMilliseconds() - timestamp;
        if (age < -2000 || age > 10000) return false;
        if (!item.TryGetProperty("type", out var kind)) return false;
        switch (kind.GetString())
        {
            case "pointer-preview":
                return item.TryGetProperty("x", out var x) && x.TryGetInt32(out var px) && px >= 0 && px <= 10000 &&
                       item.TryGetProperty("y", out var y) && y.TryGetInt32(out var py) && py >= 0 && py <= 10000;
            case "key-preview":
                if (!item.TryGetProperty("key", out var key) || key.ValueKind != JsonValueKind.String) return false;
                var value = key.GetString();
                return value is { Length: 1 } && ((value[0] >= 'A' && value[0] <= 'Z') ||
                    (value[0] >= 'a' && value[0] <= 'z') || (value[0] >= '0' && value[0] <= '9'));
            default: return false;
        }
    }
}
