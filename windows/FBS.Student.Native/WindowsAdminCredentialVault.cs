using System;
using System.IO;
using System.Security.Cryptography;
using System.Text.Json;

namespace FBS.Student.Native;

/// <summary>
/// M145: Windows-only, current-user DPAPI protection for administrator verifier material.
/// Provisioning must run under the dedicated administrator account; this class does NOT
/// authenticate callers, activate the UI, or protect against a compromised account.
/// </summary>
public static class WindowsAdminCredentialVault
{
    private sealed record CredentialRecord(int Version, byte[] Salt, byte[] Verifier,
        byte[] RegistryKey, byte[] LockoutKey);
    private static readonly byte[] Entropy = "FBS-Classroom/admin-credential-v1"u8.ToArray();

    public static void ProvisionNew(string path, string password)
    {
        if (!OperatingSystem.IsWindows()) throw new PlatformNotSupportedException("Windows DPAPI required");
        if (string.IsNullOrWhiteSpace(path)) throw new ArgumentException("Credential path required", nameof(path));
        if (string.IsNullOrWhiteSpace(password) || password.Length < 14)
            throw new ArgumentException("Use an administrator password of at least 14 characters", nameof(password));
        var full = Path.GetFullPath(path);
        var directory = Path.GetDirectoryName(full)!;
        Directory.CreateDirectory(directory);
        if (File.Exists(full)) throw new IOException("Credentials already provisioned; refusing overwrite");
        var (salt, verifier) = AuthenticatedEnrollmentService.CreateVerifier(password);
        var registryKey = RandomNumberGenerator.GetBytes(32);
        var lockoutKey = RandomNumberGenerator.GetBytes(32);
        var plain = JsonSerializer.SerializeToUtf8Bytes(new CredentialRecord(1, salt, verifier, registryKey, lockoutKey));
        try
        {
            var ciphertext = ProtectedData.Protect(plain, Entropy, DataProtectionScope.CurrentUser);
            // CreateNew avoids overwriting credentials on subsequent runs.
            using var file = new FileStream(full, FileMode.CreateNew, FileAccess.Write, FileShare.None);
            file.Write(ciphertext);
            file.Flush(true);
        }
        finally
        {
            CryptographicOperations.ZeroMemory(plain);
            CryptographicOperations.ZeroMemory(registryKey);
            CryptographicOperations.ZeroMemory(lockoutKey);
        }
    }

    public static (byte[] Salt, byte[] Verifier, byte[] RegistryKey, byte[] LockoutKey) OpenExisting(string path)
    {
        if (!OperatingSystem.IsWindows()) throw new PlatformNotSupportedException("Windows DPAPI required");
        var full = Path.GetFullPath(path);
        var blob = File.ReadAllBytes(full); // missing file must fail closed
        if (blob.Length < 32 || blob.Length > 4096) throw new InvalidDataException("Invalid credential envelope");
        var plain = ProtectedData.Unprotect(blob, Entropy, DataProtectionScope.CurrentUser);
        try
        {
            var record = JsonSerializer.Deserialize<CredentialRecord>(plain)
                ?? throw new InvalidDataException("Empty credential record");
            if (record.Version != 1 || record.Salt is null || record.Salt.Length < 16 || record.Verifier?.Length != 32 ||
                record.RegistryKey?.Length != 32 || record.LockoutKey?.Length != 32)
                throw new InvalidDataException("Invalid credential record");
            return ((byte[])record.Salt.Clone(), (byte[])record.Verifier.Clone(),
                (byte[])record.RegistryKey.Clone(), (byte[])record.LockoutKey.Clone());
        }
        finally { CryptographicOperations.ZeroMemory(plain); }
    }
}
