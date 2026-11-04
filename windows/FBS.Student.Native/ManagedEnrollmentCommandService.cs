using System;
using System.Security.Cryptography;

namespace FBS.Student.Native;

/// <summary>
/// M141: typed, fail-closed boundary for an eventual administrator-only enrollment endpoint.
/// No caller-supplied "authenticated" boolean is accepted. This is NOT an HTTP endpoint,
/// and does not authenticate a teacher's remote-control session.
/// </summary>
public sealed class ManagedEnrollmentCommandService
{
    private readonly AuthenticatedEnrollmentService administrator;
    private readonly object gate = new();

    public ManagedEnrollmentCommandService(AuthenticatedEnrollmentService administrator)
    {
        this.administrator = administrator ?? throw new ArgumentNullException(nameof(administrator));
    }

    public bool Register(string? deviceId, byte[]? subjectPublicKeyInfo, string? administratorPassword, DateTimeOffset now)
    {
        lock (gate)
        {
            if (!ValidId(deviceId) || !ValidPublicKey(subjectPublicKeyInfo) || administratorPassword is null)
                return false;
            return administrator.Provision(deviceId!, subjectPublicKeyInfo!, administratorPassword, now);
        }
    }

    public bool Remove(string? deviceId, string? administratorPassword, DateTimeOffset now)
    {
        lock (gate)
        {
            if (!ValidId(deviceId) || administratorPassword is null) return false;
            return administrator.Revoke(deviceId!, administratorPassword, now);
        }
    }

    private static bool ValidId(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length > 64) return false;
        foreach (char c in value)
            if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
                  (c >= '0' && c <= '9') || c is '-' or '_')) return false;
        return true;
    }

    private static bool ValidPublicKey(byte[]? key)
    {
        if (key is null || key.Length < 200 || key.Length > 2048) return false;
        try
        {
            using var rsa = RSA.Create();
            rsa.ImportSubjectPublicKeyInfo(key, out var bytesRead);
            return bytesRead == key.Length && rsa.KeySize >= 2048;
        }
        catch (CryptographicException) { return false; }
        catch (ArgumentException) { return false; }
    }
}
