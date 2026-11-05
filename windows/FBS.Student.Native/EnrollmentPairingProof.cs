using System;
using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;

namespace FBS.Student.Native;

/// <summary>
/// M152: a domain-separated, bounded proof of possession for future LAN enrollment.
/// A signed pairing proof does NOT authorize remote control, does NOT enroll a device,
/// and must be verified against an administrator-approved public key out of band.
/// No HTTP listener, key distribution or automatic trust is created here.
/// </summary>
public static class EnrollmentPairingProof
{
    private static readonly byte[] Domain = Encoding.ASCII.GetBytes("FBS-Classroom/enrollment-pairing/v1");
    public const int NonceLength = 32;
    public const int MaxDeviceIdLength = 64;

    public static byte[] NewNonce() => RandomNumberGenerator.GetBytes(NonceLength);

    public static byte[] Sign(string deviceId, byte[] nonce, RSA privateKey)
    {
        ArgumentNullException.ThrowIfNull(privateKey);
        var message = BuildTranscript(deviceId, nonce);
        try { return privateKey.SignData(message, HashAlgorithmName.SHA256, RSASignaturePadding.Pss); }
        finally { CryptographicOperations.ZeroMemory(message); }
    }

    public static bool Verify(string? deviceId, byte[]? nonce, byte[]? signature, byte[]? approvedSpki)
    {
        if (!ValidId(deviceId) || nonce is null || nonce.Length != NonceLength ||
            signature is null || signature.Length < 256 || signature.Length > 1024 ||
            approvedSpki is null || approvedSpki.Length < 200 || approvedSpki.Length > 2048)
            return false;
        byte[] message = BuildTranscript(deviceId!, nonce);
        try
        {
            using var rsa = RSA.Create();
            rsa.ImportSubjectPublicKeyInfo(approvedSpki, out var consumed);
            return consumed == approvedSpki.Length && rsa.KeySize >= 2048 &&
                rsa.VerifyData(message, signature, HashAlgorithmName.SHA256, RSASignaturePadding.Pss);
        }
        catch (CryptographicException) { return false; }
        catch (ArgumentException) { return false; }
        finally { CryptographicOperations.ZeroMemory(message); }
    }

    private static byte[] BuildTranscript(string deviceId, byte[] nonce)
    {
        if (!ValidId(deviceId)) throw new ArgumentException("Invalid device ID", nameof(deviceId));
        if (nonce is null || nonce.Length != NonceLength)
            throw new ArgumentException("A 32-byte fresh challenge is required", nameof(nonce));
        byte[] id = Encoding.ASCII.GetBytes(deviceId);
        byte[] message = new byte[Domain.Length + 2 + id.Length + NonceLength];
        Domain.CopyTo(message, 0);
        BinaryPrimitives.WriteUInt16BigEndian(message.AsSpan(Domain.Length, 2), (ushort)id.Length);
        id.CopyTo(message, Domain.Length + 2);
        nonce.CopyTo(message, Domain.Length + 2 + id.Length);
        return message;
    }

    private static bool ValidId(string? id)
    {
        if (string.IsNullOrWhiteSpace(id) || id.Length > MaxDeviceIdLength) return false;
        foreach (var c in id)
            if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
                  (c >= '0' && c <= '9') || c is '-' or '_')) return false;
        return true;
    }
}
