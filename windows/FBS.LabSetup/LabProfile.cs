using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using FBS.Student.Native;

namespace FBS.LabSetup;

internal sealed record LabProfile(int Version, string TeacherHost, int TeacherPort, string Fingerprint, string PairingKey)
{
    internal static readonly JsonSerializerOptions Json = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = true };
    internal void Validate()
    {
        if (Version != 1 || string.IsNullOrWhiteSpace(PairingKey) || !FBS.Student.Native.CredentialPolicy.IsStoredKey(PairingKey) || PairingKey.Length > 256 || PairingKey.Any(char.IsControl))
            throw new InvalidDataException("Invalid lab profile or lab key (8 digits or an existing legacy key required).");
        Endpoint.Validate();
        if (TeacherHost.Equals("localhost", StringComparison.OrdinalIgnoreCase) || TeacherHost.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("Select the teacher LAN address, not localhost.");
        if (Regex.IsMatch(TeacherHost, "^[0-9.]+$"))
        {
            if (!IPAddress.TryParse(TeacherHost, out var address) || address.AddressFamily != System.Net.Sockets.AddressFamily.InterNetwork)
                throw new InvalidDataException("Invalid IPv4 address.");
            var b = address.GetAddressBytes();
            if (b[0] == 0 || b[0] == 127 || b[0] >= 224 || b[0] == 169 && b[1] == 254 || TeacherHost != address.ToString())
                throw new InvalidDataException("Select a usable teacher LAN address.");
        }
    }
    internal StudentTeacherConnectionSettings Endpoint => new(1, false, TeacherHost, TeacherPort, Fingerprint.ToLowerInvariant());
    internal static LabProfile Read(string path)
    {
        FileSafety.Regular(path, 8192);
        var raw = File.ReadAllBytes(path);
        using var doc = JsonDocument.Parse(raw);
        var expected = new HashSet<string>(new[] { "version", "teacherHost", "teacherPort", "fingerprint", "pairingKey" });
        if (doc.RootElement.ValueKind != JsonValueKind.Object) throw new InvalidDataException("Invalid lab profile.");
        var properties = doc.RootElement.EnumerateObject().ToArray();
        if (properties.Length != 5 || !expected.SetEquals(properties.Select(p => p.Name))) throw new InvalidDataException("Unknown or duplicate profile fields.");
        var result = JsonSerializer.Deserialize<LabProfile>(raw, Json) ?? throw new InvalidDataException("Invalid lab profile.");
        if (result.TeacherHost is null || result.Fingerprint is null || result.PairingKey is null) throw new InvalidDataException("Missing profile fields.");
        result.Validate(); return result;
    }
    internal void WriteNew(string path)
    {
        Validate();
        using var stream = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        JsonSerializer.Serialize(stream, this, Json); stream.Flush(true);
    }
    internal bool Matches(StudentTeacherConnectionSettings endpoint, string key) => !endpoint.Discovery &&
        endpoint.Host.Equals(TeacherHost, StringComparison.OrdinalIgnoreCase) && endpoint.Port == TeacherPort &&
        endpoint.Fingerprint.Equals(Fingerprint, StringComparison.OrdinalIgnoreCase) && key == PairingKey;
}

internal static class FileSafety
{
    internal static void Regular(string path, long maximum)
    {
        var info = new FileInfo(path);
        if (!info.Exists || info.Length == 0 || info.Length > maximum || (info.Attributes & (FileAttributes.ReparsePoint | FileAttributes.Directory)) != 0)
            throw new InvalidDataException("Missing, linked, empty or oversized file.");
    }
    internal static void DirectoryWithoutLinks(string path)
    {
        for (var d = new DirectoryInfo(Path.GetFullPath(path)); d is not null; d = d.Parent)
            if (d.Exists && (d.Attributes & FileAttributes.ReparsePoint) != 0) throw new IOException("Linked state directories are not supported.");
    }
}
