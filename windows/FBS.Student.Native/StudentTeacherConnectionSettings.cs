using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace FBS.Student.Native;

internal sealed record StudentTeacherConnectionSettings(int Version, bool Discovery, string Host, int Port, string Fingerprint)
{
    internal static string FilePath => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "FBSClassroom", "teacher-endpoint.json");

    internal void Validate()
    {
        if (Version != 1) throw new InvalidDataException("Unsupported teacher connection settings");
        if (Discovery)
        {
            if (Host != "" || Port != 0 || Fingerprint != "") throw new InvalidDataException("Discovery settings must not contain a partial manual endpoint");
            return;
        }
        if (string.IsNullOrWhiteSpace(Host) || Host.Length > 253 || Host != Host.Trim() ||
            !Regex.IsMatch(Host, "^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$") ||
            Host.Split('.').Any(label => label.Length == 0 || label.Length > 63 || label.StartsWith('-') || label.EndsWith('-')) ||
            Port < 1 || Port > 65535 || Fingerprint is null || Fingerprint.Length != 64 || !Fingerprint.All(Uri.IsHexDigit))
            throw new InvalidDataException("A teacher hostname/IP, port and trusted SHA-256 fingerprint are required");
    }

    internal static StudentTeacherConnectionSettings? Load(string? file = null)
    {
        file ??= FilePath;
        if (!File.Exists(file)) return null;
        if (new FileInfo(file).Length > 4096) throw new InvalidDataException("Teacher connection settings are too large");
        var settings = JsonSerializer.Deserialize<StudentTeacherConnectionSettings>(File.ReadAllText(file))
            ?? throw new InvalidDataException("Invalid teacher connection settings");
        settings.Validate();
        return settings;
    }

    internal void SaveNew(string? file = null)
    {
        Validate();
        file ??= FilePath;
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(file))!);
        using var stream = new FileStream(file, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        JsonSerializer.Serialize(stream, this);
        stream.Flush(true);
    }

    internal void Apply(ProcessStartInfo info)
    {
        Validate();
        foreach (var name in new[] { "FBS_TEACHER_HOST", "FBS_TEACHER_PORT", "FBS_TEACHER_FINGERPRINT" }) info.Environment.Remove(name);
        if (Discovery) return;
        info.Environment["FBS_TEACHER_HOST"] = Host;
        info.Environment["FBS_TEACHER_PORT"] = Port.ToString(System.Globalization.CultureInfo.InvariantCulture);
        info.Environment["FBS_TEACHER_FINGERPRINT"] = Fingerprint.ToLowerInvariant();
    }

    internal void ReplaceExisting(StudentTeacherConnectionSettings expected, string? file = null)
    {
        Validate();
        file ??= FilePath;
        var temporary = file + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            using (var stream = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            {
                JsonSerializer.Serialize(stream, this);
                stream.Flush(true);
            }
            if (Load(file) != expected) throw new IOException("Connection settings changed while the dialog was open");
            File.Replace(temporary, file, null);
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }
}
