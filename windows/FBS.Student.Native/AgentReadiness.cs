using System.Net;
using System.Text.Json;

namespace FBS.Student.Native;

internal static class AgentReadiness
{
    internal static bool IsReady(HttpStatusCode status, string body)
    {
        if (status != HttpStatusCode.OK || body.Length > 8192) return false;
        try
        {
            using var state = JsonDocument.Parse(body);
            return state.RootElement.ValueKind == JsonValueKind.Object
                && state.RootElement.TryGetProperty("inputEnabled", out var enabled) && enabled.ValueKind == JsonValueKind.False
                && state.RootElement.TryGetProperty("session", out var session)
                && session.ValueKind is JsonValueKind.Null or JsonValueKind.Object;
        }
        catch (JsonException) { return false; }
    }
}
