using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;

namespace FBS.Teacher.Launcher;

internal sealed record TeacherConnectionSettings(int Version, string PairingKey,
    string Password, string CertificatePath, string PrivateKeyPath)
{
    internal static string StateDirectory => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "FBSClassroom", "Teacher");
    private static string SettingsPath(string? directory) => Path.Combine(directory ?? StateDirectory, "connection.dpapi");
    private static readonly byte[] Entropy = "FBS-Classroom/teacher-connection-v1"u8.ToArray();

    internal void Validate()
    {
        if (Version != 1 || !FBS.Student.Native.CredentialPolicy.IsStoredKey(PairingKey) ||
            !FBS.Student.Native.CredentialPolicy.IsStoredPassword(Password))
            throw new InvalidDataException("مفتاح المعمل وكلمة المرور يجب أن يتكونا من 3 إلى 8 أرقام.");
        using var certificate = X509Certificate2.CreateFromPemFile(CertificatePath, PrivateKeyPath);
        var now = DateTime.UtcNow;
        if (!certificate.HasPrivateKey || certificate.NotBefore.ToUniversalTime() > now || certificate.NotAfter.ToUniversalTime() <= now)
            throw new InvalidDataException("الشهادة غير صالحة حاليًا أو لا تتطابق مع المفتاح الخاص.");
    }

    internal static TeacherConnectionSettings? Load(string? directory = null)
    {
        var path = SettingsPath(directory);
        if (!File.Exists(path)) return null;
        var blob = File.ReadAllBytes(path);
        if (blob.Length < 32 || blob.Length > 16384) throw new InvalidDataException("Invalid settings envelope");
        var plain = ProtectedData.Unprotect(blob, Entropy, DataProtectionScope.CurrentUser);
        try
        {
            var settings = JsonSerializer.Deserialize<TeacherConnectionSettings>(plain)
                ?? throw new InvalidDataException("إعدادات المعلم غير صالحة.");
            settings.Validate();
            return settings;
        }
        finally { CryptographicOperations.ZeroMemory(plain); }
    }

    internal void SaveNew(string? directory = null)
    {
        Validate();
        Directory.CreateDirectory(directory ?? StateDirectory);
        var plain = JsonSerializer.SerializeToUtf8Bytes(this);
        try
        {
            var encrypted = ProtectedData.Protect(plain, Entropy, DataProtectionScope.CurrentUser);
            using var file = new FileStream(SettingsPath(directory), FileMode.CreateNew, FileAccess.Write, FileShare.None);
            file.Write(encrypted);
            file.Flush(true);
        }
        finally { CryptographicOperations.ZeroMemory(plain); }
    }

    internal void Apply(System.Diagnostics.ProcessStartInfo startInfo)
    {
        startInfo.Environment["FBS_PAIRING_KEY"] = PairingKey;
        startInfo.Environment["FBS_TEACHER_PASSWORD"] = Password;
        startInfo.Environment["FBS_TLS_CERT"] = CertificatePath;
        startInfo.Environment["FBS_TLS_KEY"] = PrivateKeyPath;
    }
}
