using System;
using System.Security.Cryptography;

namespace FBS.Student.Native;

/// <summary>
/// A persistent, non-exportable Windows CNG key scoped to the current Windows user.
/// This is a local identity foundation, not an enrollment protocol or remote-control permission.
/// </summary>
public static class DeviceIdentity
{
    private const string KeyName = "FBS.Classroom.Student.Identity.v1";

    public static string GetDeviceId()
    {
        if (!OperatingSystem.IsWindows()) throw new PlatformNotSupportedException();
        using var key = OpenOrCreateKey();
        using var rsa = new RSACng(key);
        byte[] publicKey = rsa.ExportSubjectPublicKeyInfo();
        byte[] digest = SHA256.HashData(publicKey);
        return Convert.ToHexString(digest)[..24];
    }

    /// <summary>Open the existing per-user signing key for an explicitly initiated identity test.
    /// Never exports the private key; fails closed when no key has been provisioned.</summary>
    public static RSA OpenExistingSigningKey()
    {
        if (!OperatingSystem.IsWindows()) throw new PlatformNotSupportedException();
        var provider = CngProvider.MicrosoftSoftwareKeyStorageProvider;
        if (!CngKey.Exists(KeyName, provider))
            throw new InvalidOperationException("Student identity has not been provisioned");
        return new RSACng(CngKey.Open(KeyName, provider));
    }

    private static CngKey OpenOrCreateKey()
    {
        var provider = CngProvider.MicrosoftSoftwareKeyStorageProvider;
        if (CngKey.Exists(KeyName, provider)) return CngKey.Open(KeyName, provider);
        try
        {
            return CngKey.Create(CngAlgorithm.Rsa, KeyName, new CngKeyCreationParameters
            {
                Provider = provider,
                KeyCreationOptions = CngKeyCreationOptions.None,
                ExportPolicy = CngExportPolicies.None,
                KeyUsage = CngKeyUsages.Signing,
                Parameters = { new CngProperty("Length", BitConverter.GetBytes(3072), CngPropertyOptions.None) }
            });
        }
        catch (CryptographicException) when (CngKey.Exists(KeyName, provider))
        {
            return CngKey.Open(KeyName, provider);
        }
    }
}
