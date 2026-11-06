using System.Security.Cryptography;
using System.Text;

namespace FBS.Student.Native;

internal static class StudentPairingKeyStore
{
    internal static string OpenExisting(string path)
    {
        var size = new FileInfo(path).Length;
        if (size < 64 || size > 16384) throw new InvalidDataException("Invalid pairing envelope size");
        var encoded = File.ReadAllText(path).Trim();
        byte[] encrypted;
        try { encrypted = Convert.FromHexString(encoded); }
        catch (FormatException) { throw new InvalidDataException("Invalid pairing envelope encoding"); }
        var plain = ProtectedData.Unprotect(encrypted, null, DataProtectionScope.CurrentUser);
        try
        {
            if (plain.Length < 16 || plain.Length > 512 || plain.Length % 2 != 0)
                throw new InvalidDataException("Invalid pairing key length");
            var key = Encoding.Unicode.GetString(plain);
            if (!CredentialPolicy.IsStoredKey(key)) throw new InvalidDataException("Empty pairing key");
            return key;
        }
        finally { CryptographicOperations.ZeroMemory(plain); }
    }

    internal static void SaveNew(string path, string key)
    {
        if (!CredentialPolicy.IsStoredKey(key) || key.Length > 256)
            throw new ArgumentException("Lab key must contain 8 digits or be an existing legacy key", nameof(key));
        var plain = Encoding.Unicode.GetBytes(key);
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path))!);
            var encrypted = ProtectedData.Protect(plain, null, DataProtectionScope.CurrentUser);
            using var file = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None);
            var encoded = Encoding.ASCII.GetBytes(Convert.ToHexString(encrypted).ToLowerInvariant());
            file.Write(encoded);
            file.Flush(true);
        }
        finally { CryptographicOperations.ZeroMemory(plain); }
    }
}
