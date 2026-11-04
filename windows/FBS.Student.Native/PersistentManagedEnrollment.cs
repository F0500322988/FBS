using System;
using System.IO;

namespace FBS.Student.Native;

/// <summary>
/// M137: fail-closed persistence boundary for a managed-device allowlist.
/// Caller MUST authenticate the administrator independently; the boolean is NOT authentication.
/// The storage key must be provisioned securely outside this component.
/// This service is not yet connected to the HTTP enrollment endpoints or native input.
/// </summary>
public sealed class PersistentManagedEnrollment
{
    private readonly string path;
    private readonly byte[] secret;
    private ManagedDeviceRegistry registry;
    private bool locked;
    public bool IsLocked => locked;

    public PersistentManagedEnrollment(string path, byte[] secret)
    {
        if (string.IsNullOrWhiteSpace(path)) throw new ArgumentException("Invalid path", nameof(path));
        if (secret is null || secret.Length != 32) throw new ArgumentException("32-byte key required", nameof(secret));
        this.path = Path.GetFullPath(path);
        this.secret = (byte[])secret.Clone();
        // Never silently recreate a missing or corrupt registry: that could restore revoked devices.
        registry = EncryptedDeviceRegistryStore.Load(this.path, this.secret);
    }

    /// <summary>First-time provisioning must be explicitly authorized; existing files are never overwritten.</summary>
    public static PersistentManagedEnrollment InitializeNew(string path, byte[] secret, bool administratorAuthenticated)
    {
        if (!administratorAuthenticated) throw new UnauthorizedAccessException("Administrator authorization required");
        if (string.IsNullOrWhiteSpace(path)) throw new ArgumentException("Invalid path", nameof(path));
        var full = Path.GetFullPath(path);
        if (File.Exists(full)) throw new IOException("Registry already exists");
        // Directory creation and file initialization must be restricted to an administrator-owned path.
        EncryptedDeviceRegistryStore.Save(full, new ManagedDeviceRegistry(), secret);
        return new PersistentManagedEnrollment(full, secret);
    }

    /// <summary>Read-only identifiers for teacher roster. No keys or pending challenges escape.</summary>
    public (string[] Enrolled, string[] Revoked) GetRosterSnapshot()
    {
        if (locked) throw new InvalidOperationException("Enrollment registry is locked");
        var (devices, revoked) = registry.ExportForStorage();
        return (devices.Keys.OrderBy(x => x, StringComparer.Ordinal).ToArray(),
                revoked.OrderBy(x => x, StringComparer.Ordinal).ToArray());
    }

    public bool Provision(string deviceId, byte[] spki, bool administratorAuthenticated)
    {
        if (locked || !administratorAuthenticated) return false;
        return Commit(candidate => candidate.Provision(deviceId, spki, true));
    }

    public bool Revoke(string deviceId, bool administratorAuthenticated)
    {
        if (locked || !administratorAuthenticated) return false;
        return Commit(candidate => candidate.Revoke(deviceId, true));
    }

    public byte[]? IssueChallenge(string deviceId, DateTimeOffset now) =>
        locked ? null : registry.IssueChallenge(deviceId, now);

    public bool VerifyOnce(string deviceId, byte[] signature, DateTimeOffset now) =>
        !locked && registry.VerifyOnce(deviceId, signature, now);

    private bool Commit(Func<ManagedDeviceRegistry, bool> mutation)
    {
        try
        {
            // Clone before mutation; never expose an uncommitted authorization change.
            var (devices, revoked) = registry.ExportForStorage();
            var candidate = ManagedDeviceRegistry.RestoreFromStorage(devices, revoked);
            if (!mutation(candidate)) return false;
            EncryptedDeviceRegistryStore.Save(path, candidate, secret);
            registry = EncryptedDeviceRegistryStore.Load(path, secret);
            return true;
        }
        catch (Exception ex) when (ex is IOException || ex is UnauthorizedAccessException ||
                                   ex is System.Security.Cryptography.CryptographicException ||
                                   ex is InvalidDataException || ex is ArgumentException)
        {
            locked = true; // persistence errors must never permit further enrollment/verification
            return false;
        }
    }
}
