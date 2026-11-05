using System;
using System.Buffers.Binary;
using System.IO;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Threading;
using System.Threading.Tasks;

namespace FBS.Student.Native;

/// <summary>
/// M153: outbound-only TLS transport building block for a trusted LAN endpoint.
/// Requires an administrator-configured SHA-256 certificate pin and a DNS identity.
/// Does not listen, enroll a device, authenticate an RSA pairing proof, or permit control.
/// Caller must perform application-level challenge/response and authorization BEFORE
/// processing any classroom command. Not wired into the student runtime by default.
/// </summary>
public sealed class PinnedLanTlsChannel : IAsyncDisposable
{
    public const int MaxFrameBytes = 64 * 1024;
    private readonly TcpClient _tcp;
    private readonly SslStream _tls;
    private readonly SemaphoreSlim _writeLock = new(1, 1);
    private readonly SemaphoreSlim _readLock = new(1, 1);
    private bool _disposed;

    private PinnedLanTlsChannel(TcpClient tcp, SslStream tls)
    {
        _tcp = tcp;
        _tls = tls;
    }

    public static async Task<PinnedLanTlsChannel> ConnectAsync(
        string host, int port, byte[] expectedCertificateSha256,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(host) || host.Length > 253 ||
            host.Contains('/') || host.Contains('\\') || host.Contains('@') ||
            host.Contains(':') || host.Trim() != host)
            throw new ArgumentException("A configured DNS hostname is required", nameof(host));
        if (port < 1 || port > 65535) throw new ArgumentOutOfRangeException(nameof(port));
        if (expectedCertificateSha256 is null || expectedCertificateSha256.Length != 32)
            throw new ArgumentException("A 32-byte SHA-256 certificate pin is required", nameof(expectedCertificateSha256));

        byte[] pin = (byte[])expectedCertificateSha256.Clone();
        var tcp = new TcpClient();
        SslStream? tls = null;
        try
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(TimeSpan.FromSeconds(10));
            await tcp.ConnectAsync(host, port, timeout.Token).ConfigureAwait(false);
            tls = new SslStream(tcp.GetStream(), leaveInnerStreamOpen: false,
                (_, certificate, _, errors) =>
                {
                    if (certificate is null ||
                        (errors & SslPolicyErrors.RemoteCertificateNameMismatch) != 0 ||
                        (errors & SslPolicyErrors.RemoteCertificateNotAvailable) != 0)
                        return false;
                    using var cert = new X509Certificate2(certificate);
                    byte[] actual = SHA256.HashData(cert.RawData);
                    try { return CryptographicOperations.FixedTimeEquals(actual, pin); }
                    finally { CryptographicOperations.ZeroMemory(actual); }
                });
            await tls.AuthenticateAsClientAsync(new SslClientAuthenticationOptions
            {
                TargetHost = host,
                EnabledSslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13,
                CertificateRevocationCheckMode = X509RevocationMode.Online
            }, timeout.Token).ConfigureAwait(false);
            if (!tls.IsEncrypted || !tls.IsSigned || !tls.IsAuthenticated)
                throw new AuthenticationException("TLS peer authentication failed");
            return new PinnedLanTlsChannel(tcp, tls);
        }
        catch
        {
            if (tls is not null) await tls.DisposeAsync().ConfigureAwait(false);
            tcp.Dispose();
            throw;
        }
        finally { CryptographicOperations.ZeroMemory(pin); }
    }

    public async Task SendFrameAsync(ReadOnlyMemory<byte> payload, CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        if (payload.Length < 1 || payload.Length > MaxFrameBytes)
            throw new ArgumentOutOfRangeException(nameof(payload));
        await _writeLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            byte[] prefix = new byte[4];
            BinaryPrimitives.WriteInt32BigEndian(prefix, payload.Length);
            await _tls.WriteAsync(prefix, cancellationToken).ConfigureAwait(false);
            await _tls.WriteAsync(payload, cancellationToken).ConfigureAwait(false);
            await _tls.FlushAsync(cancellationToken).ConfigureAwait(false);
        }
        finally { _writeLock.Release(); }
    }

    public async Task<byte[]> ReceiveFrameAsync(CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        await _readLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            byte[] prefix = new byte[4];
            await _tls.ReadExactlyAsync(prefix, cancellationToken).ConfigureAwait(false);
            int size = BinaryPrimitives.ReadInt32BigEndian(prefix);
            if (size < 1 || size > MaxFrameBytes)
                throw new InvalidDataException("Rejected oversized or empty LAN frame");
            byte[] payload = new byte[size];
            await _tls.ReadExactlyAsync(payload, cancellationToken).ConfigureAwait(false);
            return payload;
        }
        finally { _readLock.Release(); }
    }

    /// <summary>M164: raw presence bytes only after a successful framed RSA proof.
    /// Do not call before the server acknowledges the device identity.</summary>
    internal Task RunVerifiedPresenceAsync(CancellationToken stopToken) =>
        AuthenticatedPresenceProtocol.RunStudentAsync(_tls, stopToken);

    public async ValueTask DisposeAsync()
    {
        if (_disposed) return;
        _disposed = true;
        await _tls.DisposeAsync().ConfigureAwait(false);
        _tcp.Dispose();
        _readLock.Dispose();
        _writeLock.Dispose();
    }
}
