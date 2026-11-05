using System;
using System.Collections.Generic;
using System.Security.Cryptography;

namespace FBS.Student.Native;

/// <summary>
/// M135: in-memory, explicitly provisioned public-key allowlist and single-use challenges.
/// This is a standalone verification primitive, NOT a trusted persistent enrollment service.
/// Provision must be called only by an authenticated administrator in a future integration.
/// </summary>
public sealed class ManagedDeviceRegistry
{
    private readonly Dictionary<string, byte[]> enrolled = new(StringComparer.Ordinal);
    private readonly Dictionary<string, PendingChallenge> pending = new(StringComparer.Ordinal);
    private readonly HashSet<string> revoked = new(StringComparer.Ordinal);
    private const int MaxDevices = 40;
    private static readonly TimeSpan Lifetime = TimeSpan.FromSeconds(30);
    private sealed record PendingChallenge(byte[] Nonce, DateTimeOffset ExpiresAt);

    public bool Provision(string deviceId, byte[] spki, bool administratorAuthenticated)
    {
        if (!administratorAuthenticated || !ValidId(deviceId) || spki is null || revoked.Contains(deviceId)) return false;
        try
        {
            using var rsa = RSA.Create();
            rsa.ImportSubjectPublicKeyInfo(spki, out var read);
            if (read != spki.Length || rsa.KeySize < 2048) return false;
        }
        catch (CryptographicException) { return false; }
        catch (ArgumentException) { return false; }
        if (enrolled.ContainsKey(deviceId) || enrolled.Count >= MaxDevices) return false;
        enrolled.Add(deviceId, (byte[])spki.Clone());
        return true;
    }

    public byte[]? IssueChallenge(string deviceId, DateTimeOffset now)
    {
        if (!enrolled.ContainsKey(deviceId) || revoked.Contains(deviceId)) return null;
        var nonce = DeviceChallengeProof.CreateChallenge();
        pending[deviceId] = new PendingChallenge(nonce, now.Add(Lifetime));
        return (byte[])nonce.Clone();
    }

    public bool VerifyOnce(string deviceId, byte[] signature, DateTimeOffset now)
    {
        if (!ValidId(deviceId) || !pending.Remove(deviceId, out var issued)) return false;
        if (revoked.Contains(deviceId) || !enrolled.TryGetValue(deviceId, out var spki) ||
            now >= issued.ExpiresAt || now < issued.ExpiresAt - Lifetime) return false;
        return DeviceChallengeProof.Verify(spki, issued.Nonce, signature);
    }

    public bool Revoke(string deviceId, bool administratorAuthenticated)
    {
        if (!administratorAuthenticated || !enrolled.Remove(deviceId)) return false;
        pending.Remove(deviceId);
        revoked.Add(deviceId); // no silent re-enrollment under same ID
        return true;
    }

    // M136: authenticated snapshot export/import. Pending challenges are intentionally never persisted.
    internal (Dictionary<string, byte[]> Devices, string[] Revoked) ExportForStorage() =>
        (enrolled.ToDictionary(x => x.Key, x => (byte[])x.Value.Clone(), StringComparer.Ordinal),
         new List<string>(revoked).ToArray());

    internal static ManagedDeviceRegistry RestoreFromStorage(
        Dictionary<string, byte[]> devices, IEnumerable<string> revokedIds)
    {
        if (devices is null || revokedIds is null || devices.Count > MaxDevices)
            throw new ArgumentException("Invalid registry snapshot");
        var restored = new ManagedDeviceRegistry();
        foreach (var id in revokedIds)
            if (!ValidId(id) || !restored.revoked.Add(id))
                throw new ArgumentException("Invalid revoked ID");
        foreach (var (id, spki) in devices)
        {
            if (!restored.Provision(id, spki, administratorAuthenticated: true))
                throw new ArgumentException("Invalid enrolled device in snapshot");
        }
        return restored;
    }

    private static bool ValidId(string? id)
    {
        if (string.IsNullOrWhiteSpace(id) || id.Length > 64) return false;
        foreach (var c in id)
            if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
                  (c >= '0' && c <= '9') || c == '-' || c == '_')) return false;
        return true;
    }
}
