using System;
using System.Security.Cryptography;

namespace FBS.Student.Native;

/// <summary>
/// M134: cryptographic proof-of-possession primitive. A valid signature proves
/// control of a private key, NOT that a teacher is authorized or a device enrolled.
/// A trusted enrollment registry and authenticated channel are still required.
/// </summary>
public static class DeviceChallengeProof
{
    public const int ChallengeBytes = 32;

    public static byte[] CreateChallenge() => RandomNumberGenerator.GetBytes(ChallengeBytes);

    public static byte[] Sign(RSA privateKey, byte[] challenge)
    {
        if (privateKey is null || !ValidChallenge(challenge))
            throw new ArgumentException("A valid 32-byte challenge and private key are required.");
        return privateKey.SignData(challenge, HashAlgorithmName.SHA256, RSASignaturePadding.Pss);
    }

    public static bool Verify(byte[] publicKeySpki, byte[] challenge, byte[] signature)
    {
        if (publicKeySpki is null || publicKeySpki.Length == 0 ||
            !ValidChallenge(challenge) || signature is null || signature.Length == 0)
            return false;
        try
        {
            using var key = RSA.Create();
            key.ImportSubjectPublicKeyInfo(publicKeySpki, out int consumed);
            return consumed == publicKeySpki.Length &&
                key.VerifyData(challenge, signature, HashAlgorithmName.SHA256, RSASignaturePadding.Pss);
        }
        catch (CryptographicException) { return false; }
        catch (ArgumentException) { return false; }
    }

    private static bool ValidChallenge(byte[]? value) => value is { Length: ChallengeBytes };
}
