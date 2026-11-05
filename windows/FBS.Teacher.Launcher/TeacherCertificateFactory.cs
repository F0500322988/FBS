using System.Net;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;

namespace FBS.Teacher.Launcher;

internal static class TeacherCertificateFactory
{
    internal static (string CertificatePem, string PrivateKeyPem, string Fingerprint) Create(string host)
    {
        if (string.IsNullOrWhiteSpace(host) || host.Trim() != host || host.Length > 253 ||
            (Uri.CheckHostName(host) != UriHostNameType.Dns && Uri.CheckHostName(host) != UriHostNameType.IPv4))
            throw new ArgumentException("A LAN DNS hostname or IPv4 address is required", nameof(host));
        using var key = RSA.Create(3072);
        var request = new CertificateRequest("CN=FBS Classroom Teacher", key, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        var names = new SubjectAlternativeNameBuilder();
        if (IPAddress.TryParse(host, out var address)) names.AddIpAddress(address);
        else names.AddDnsName(host);
        request.CertificateExtensions.Add(names.Build());
        request.CertificateExtensions.Add(new X509BasicConstraintsExtension(false, false, 0, true));
        request.CertificateExtensions.Add(new X509KeyUsageExtension(X509KeyUsageFlags.DigitalSignature | X509KeyUsageFlags.KeyEncipherment, true));
        request.CertificateExtensions.Add(new X509EnhancedKeyUsageExtension(new System.Security.Cryptography.OidCollection
        {
            new Oid("1.3.6.1.5.5.7.3.1") // TLS server authentication only.
        }, true));
        using var certificate = request.CreateSelfSigned(DateTimeOffset.UtcNow.AddMinutes(-5), DateTimeOffset.UtcNow.AddDays(365));
        return (certificate.ExportCertificatePem(), key.ExportPkcs8PrivateKeyPem(),
            Convert.ToHexString(SHA256.HashData(certificate.RawData)));
    }
}
