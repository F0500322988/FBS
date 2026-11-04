using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace FBS.Student.Native;

/// <summary>
/// M136: authenticated, encrypted snapshot storage for provisioned public keys and revocations.
/// The 32-byte secret MUST be supplied by a separately authenticated, managed provisioning
/// service and protected outside this file. Never store it beside the registry snapshot.
/// This component is not wired to enrollment/teacher authentication or native input.
/// </summary>
public static class EncryptedDeviceRegistryStore
{
    private static readonly byte[] Context = Encoding.UTF8.GetBytes("FBS-Classroom/managed-registry/v1");
    private sealed record Snapshot(int Version, Dictionary<string, string> Devices, string[] Revoked);

    public static void Save(string path, ManagedDeviceRegistry registry, byte[] secret)
    {
        ValidateSecret(secret);
        if (string.IsNullOrWhiteSpace(path)) throw new ArgumentException("Invalid path", nameof(path));
        var (devices, revoked) = registry.ExportForStorage();
        var plain = JsonSerializer.SerializeToUtf8Bytes(new Snapshot(1,
            devices.ToDictionary(x => x.Key, x => Convert.ToBase64String(x.Value), StringComparer.Ordinal),
            revoked.OrderBy(x => x, StringComparer.Ordinal).ToArray()));
        byte[] nonce = RandomNumberGenerator.GetBytes(12);
        byte[] ciphertext = new byte[plain.Length];
        byte[] tag = new byte[16];
        try
        {
            using (var aes = new AesGcm(secret, 16)) aes.Encrypt(nonce, plain, ciphertext, tag, Context);
            var output = new byte[4 + nonce.Length + tag.Length + ciphertext.Length];
            Encoding.ASCII.GetBytes("FBR1").CopyTo(output, 0);
            nonce.CopyTo(output, 4);
            tag.CopyTo(output, 16);
            ciphertext.CopyTo(output, 32);
            var full = Path.GetFullPath(path);
            Directory.CreateDirectory(Path.GetDirectoryName(full)!);
            var temp = full + "." + Guid.NewGuid().ToString("N") + ".tmp";
            try
            {
                File.WriteAllBytes(temp, output);
                File.Move(temp, full, true);
            }
            finally { if (File.Exists(temp)) File.Delete(temp); }
        }
        finally { CryptographicOperations.ZeroMemory(plain); }
    }

    public static ManagedDeviceRegistry Load(string path, byte[] secret)
    {
        ValidateSecret(secret);
        var data = File.ReadAllBytes(path); // exceptions must fail closed at the caller
        if (data.Length < 34 || data.Length > 1024 * 1024 ||
            Encoding.ASCII.GetString(data, 0, 4) != "FBR1")
            throw new InvalidDataException("Invalid managed registry envelope");
        var plain = new byte[data.Length - 32];
        try
        {
            using (var aes = new AesGcm(secret, 16))
                aes.Decrypt(data.AsSpan(4, 12), data.AsSpan(32), data.AsSpan(16, 16), plain, Context);
            var snapshot = JsonSerializer.Deserialize<Snapshot>(plain)
                ?? throw new InvalidDataException("Empty registry");
            if (snapshot.Version != 1 || snapshot.Devices is null || snapshot.Revoked is null)
                throw new InvalidDataException("Unsupported registry version");
            var devices = snapshot.Devices.ToDictionary(x => x.Key,
                x => Convert.FromBase64String(x.Value), StringComparer.Ordinal);
            return ManagedDeviceRegistry.RestoreFromStorage(devices, snapshot.Revoked);
        }
        finally { CryptographicOperations.ZeroMemory(plain); }
    }

    private static void ValidateSecret(byte[] secret)
    {
        if (secret is null || secret.Length != 32)
            throw new ArgumentException("A separately protected 32-byte key is required", nameof(secret));
    }
}
