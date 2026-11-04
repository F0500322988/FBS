using System;
using System.Security.Cryptography;
using System.IO;
using System.Buffers.Binary;
using System.Text;

namespace FBS.Student.Native;

/// <summary>
/// M138: credential-verified enrollment facade. The underlying M137 boolean is never
/// supplied by an HTTP caller. This is an integration primitive, not an HTTP service.
/// Password verifier must be provisioned and stored by a trusted administrator.
/// </summary>
public sealed class AuthenticatedEnrollmentService
{
    private readonly PersistentManagedEnrollment enrollment;
    private readonly byte[] salt;
    private readonly byte[] verifier;
    private readonly object gate = new();
    private int failures;
    private DateTimeOffset blockedUntil;
    private const int Iterations = 310_000;
    private readonly string? lockoutPath;
    private readonly byte[]? lockoutKey;
    private bool lockedDown;

    // M139: optional encrypted, durable attempt state. Store in an administrator-owned directory.
    // A missing file is valid only on first provisioning; prevent deleting an existing state
    // by requiring the caller to manage the file's lifecycle and ACLs.
    public AuthenticatedEnrollmentService(PersistentManagedEnrollment enrollment, byte[] salt, byte[] verifier,
        string lockoutPath, byte[] lockoutKey) : this(enrollment, salt, verifier, lockoutPath, lockoutKey, false) { }

    private AuthenticatedEnrollmentService(PersistentManagedEnrollment enrollment, byte[] salt, byte[] verifier,
        string lockoutPath, byte[] lockoutKey, bool requireExisting) : this(enrollment, salt, verifier)
    {
        if (string.IsNullOrWhiteSpace(lockoutPath) || lockoutKey is null || lockoutKey.Length != 32)
            throw new ArgumentException("A path and a 32-byte lockout key are required");
        this.lockoutPath = Path.GetFullPath(lockoutPath);
        this.lockoutKey = (byte[])lockoutKey.Clone();
        try
        {
            if (File.Exists(this.lockoutPath)) LoadState();
            else if (requireExisting) lockedDown = true;
            else SaveState(); // Only explicit initial provisioning may create a new state.
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or CryptographicException or InvalidDataException)
        { lockedDown = true; }
    }

    // M140: use this for every restart of an already-provisioned administrator.
    // Missing state must NEVER be interpreted as first-time setup: deleting the
    // file would otherwise reset failed attempts and the lockout window.
    public static AuthenticatedEnrollmentService OpenExisting(
        PersistentManagedEnrollment enrollment, byte[] salt, byte[] verifier,
        string lockoutPath, byte[] lockoutKey)
    {
        if (string.IsNullOrWhiteSpace(lockoutPath))
            throw new ArgumentException("Lockout path is required", nameof(lockoutPath));
        return new AuthenticatedEnrollmentService(enrollment, salt, verifier,
            lockoutPath, lockoutKey, requireExisting: true);
    }

    public bool IsLockedDown => lockedDown;

    private void LoadState()
    {
        var blob = File.ReadAllBytes(lockoutPath!);
        if (blob.Length != 44 || blob[0] != 139 || blob[1] != 1) throw new InvalidDataException("Invalid lockout state");
        Span<byte> plain = stackalloc byte[14];
        using (var aes = new AesGcm(lockoutKey!, 16))
            aes.Decrypt(blob.AsSpan(2, 12), blob.AsSpan(14, 14), blob.AsSpan(28, 16), plain);
        failures = BinaryPrimitives.ReadInt32LittleEndian(plain);
        blockedUntil = DateTimeOffset.FromUnixTimeSeconds(BinaryPrimitives.ReadInt64LittleEndian(plain[4..]));
        if (failures < 0 || failures >= 5) throw new InvalidDataException("Invalid attempt counter");
    }

    private void SaveState()
    {
        if (lockoutPath is null) return;
        Span<byte> plain = stackalloc byte[14];
        BinaryPrimitives.WriteInt32LittleEndian(plain, failures);
        BinaryPrimitives.WriteInt64LittleEndian(plain[4..], blockedUntil == default ? 0 : blockedUntil.ToUnixTimeSeconds());
        var blob = new byte[44];
        blob[0] = 139; blob[1] = 1;
        RandomNumberGenerator.Fill(blob.AsSpan(2, 12));
        using (var aes = new AesGcm(lockoutKey!, 16))
            aes.Encrypt(blob.AsSpan(2, 12), plain, blob.AsSpan(14, 14), blob.AsSpan(28, 16));
        var temp = lockoutPath + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            using (var file = new FileStream(temp, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            { file.Write(blob); file.Flush(true); }
            File.Move(temp, lockoutPath, true);
        }
        finally { if (File.Exists(temp)) File.Delete(temp); }
    }

    private bool PersistOrLock()
    {
        try { SaveState(); return true; }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or CryptographicException)
        { lockedDown = true; return false; }
    }

    public AuthenticatedEnrollmentService(PersistentManagedEnrollment enrollment, byte[] salt, byte[] verifier)
    {
        this.enrollment = enrollment ?? throw new ArgumentNullException(nameof(enrollment));
        if (salt is null || salt.Length < 16 || verifier is null || verifier.Length != 32)
            throw new ArgumentException("Invalid administrator credential verifier");
        this.salt = (byte[])salt.Clone();
        this.verifier = (byte[])verifier.Clone();
    }

    public static (byte[] Salt, byte[] Verifier) CreateVerifier(string password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < 14)
            throw new ArgumentException("Administrator password must contain at least 14 characters");
        var salt = RandomNumberGenerator.GetBytes(32);
        return (salt, Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, 32));
    }

    public bool Provision(string deviceId, byte[] publicKey, string password, DateTimeOffset now)
    {
        lock (gate)
        {
            if (!Authenticate(password, now)) return false;
            return enrollment.Provision(deviceId, publicKey, administratorAuthenticated: true);
        }
    }

    public bool Revoke(string deviceId, string password, DateTimeOffset now)
    {
        lock (gate)
        {
            if (!Authenticate(password, now)) return false;
            return enrollment.Revoke(deviceId, administratorAuthenticated: true);
        }
    }

    private bool Authenticate(string? password, DateTimeOffset now)
    {
        if (lockedDown || enrollment.IsLocked || now < blockedUntil) return false;
        // Bound work and avoid attacker-controlled unbounded password allocation.
        if (password is null || password.Length > 1024) return Failure(now);
        byte[] candidate = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, 32);
        try
        {
            if (!CryptographicOperations.FixedTimeEquals(candidate, verifier)) return Failure(now);
            failures = 0;
            return PersistOrLock();
        }
        finally { CryptographicOperations.ZeroMemory(candidate); }
    }

    private bool Failure(DateTimeOffset now)
    {
        failures++;
        if (failures >= 5)
        {
            blockedUntil = now.AddMinutes(5);
            failures = 0;
        }
        PersistOrLock();
        return false;
    }
}
