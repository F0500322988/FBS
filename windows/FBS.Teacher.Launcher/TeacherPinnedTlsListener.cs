using System;
using System.Buffers.Binary;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using FBS.Student.Native;
using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Security.Cryptography.X509Certificates;
using System.Threading;
using System.Threading.Tasks;

namespace FBS.Teacher.Launcher;

/// <summary>
/// M154 opt-in TLS listener. Transport only: no device enrollment, pairing,
/// classroom commands, remote input, or automatic startup. Bind to loopback by
/// default; LAN binding requires an explicit administrator-selected IP address.
/// Application protocol MUST authenticate a registered device before use.
/// </summary>
public sealed class TeacherPinnedTlsListener : IAsyncDisposable
{
    public const int MaxFrameBytes = 64 * 1024;
    private readonly TcpListener _listener;
    private readonly X509Certificate2 _certificate;
    private readonly SemaphoreSlim _slots = new(40, 40);
    private readonly object _registrySync = new();
    private readonly object _connectionsSync = new();
    private readonly System.Collections.Generic.HashSet<TcpClient> _connections = new();
    /// <summary>Identity-only audit outcome. Never grants access or a control session.</summary>
    public event Action<PairingAuditOutcome>? PairingAuditCompleted;
    /// <summary>Lifecycle of an authenticated presence session; no control authorization.</summary>
    public event Action<string, Guid, bool>? PresenceSessionChanged;
    private long _accepted, _rejected;
    public (long Accepted, long Rejected) AuditCounts =>
        (Interlocked.Read(ref _accepted), Interlocked.Read(ref _rejected));
    private bool _started;
    private bool _disposed;

    public TeacherPinnedTlsListener(IPAddress bindAddress, int port, X509Certificate2 certificate)
    {
        ArgumentNullException.ThrowIfNull(bindAddress);
        ArgumentNullException.ThrowIfNull(certificate);
        if (port < 1 || port > 65535) throw new ArgumentOutOfRangeException(nameof(port));
        if (!certificate.HasPrivateKey) throw new ArgumentException("TLS server certificate must contain a private key", nameof(certificate));
        if (bindAddress.AddressFamily != AddressFamily.InterNetwork && bindAddress.AddressFamily != AddressFamily.InterNetworkV6)
            throw new ArgumentException("An explicit IPv4 or IPv6 bind address is required", nameof(bindAddress));
        if (IPAddress.Any.Equals(bindAddress) || IPAddress.IPv6Any.Equals(bindAddress))
            throw new ArgumentException("Wildcard binding is forbidden; select a specific interface", nameof(bindAddress));
        _listener = new TcpListener(bindAddress, port);
        _certificate = new X509Certificate2(certificate);
    }

    /// <summary>Only accepts and closes TLS connections; never executes client messages.</summary>
    public async Task RunAuditOnlyAsync(CancellationToken cancellationToken)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        if (_started) throw new InvalidOperationException("Listener already started");
        _started = true;
        _listener.Start(backlog: 40);
        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                // Acquire a slot before accept so accepted sockets cannot pile up.
                await _slots.WaitAsync(cancellationToken).ConfigureAwait(false);
                TcpClient client;
                try { client = await _listener.AcceptTcpClientAsync(cancellationToken).ConfigureAwait(false); }
                catch { _slots.Release(); throw; }
                TrackConnection(client);
                _ = HandleAuditOnlyAsync(client, cancellationToken);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { }
        finally { _listener.Stop(); CloseAllConnections(); }
    }

    /// <summary>
    /// M155: opt-in, identity-only handshake. The registry must have been opened
    /// from the administrator-protected encrypted store. No commands are accepted.
    /// A successful proof does not create an authorized control session.
    /// </summary>
    public async Task RunPairingAuditAsync(PersistentManagedEnrollment registry, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(registry);
        ObjectDisposedException.ThrowIf(_disposed, this);
        if (registry.IsLocked) throw new InvalidOperationException("Enrollment registry is locked");
        if (_started) throw new InvalidOperationException("Listener already started");
        _started = true;
        _listener.Start(backlog: 40);
        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                await _slots.WaitAsync(cancellationToken).ConfigureAwait(false);
                TcpClient client;
                try { client = await _listener.AcceptTcpClientAsync(cancellationToken).ConfigureAwait(false); }
                catch { _slots.Release(); throw; }
                TrackConnection(client);
                _ = HandlePairingAuditAsync(client, registry, sessionStop: cancellationToken);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { }
        finally { _listener.Stop(); CloseAllConnections(); }
    }

    /// <summary>M164: opt-in identity-verified TLS presence sessions; no commands.
    /// Separate from RunPairingAuditAsync; callers explicitly select the mode.</summary>
    public async Task RunPresenceAsync(PersistentManagedEnrollment registry, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(registry);
        ObjectDisposedException.ThrowIf(_disposed, this);
        if (registry.IsLocked) throw new InvalidOperationException("Enrollment registry is locked");
        if (_started) throw new InvalidOperationException("Listener already started");
        _started = true;
        _listener.Start(backlog: 40);
        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                await _slots.WaitAsync(cancellationToken).ConfigureAwait(false);
                TcpClient client;
                try { client = await _listener.AcceptTcpClientAsync(cancellationToken).ConfigureAwait(false); }
                catch { _slots.Release(); throw; }
                TrackConnection(client);
                _ = HandlePairingAuditAsync(client, registry, true, cancellationToken);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { }
        finally { _listener.Stop(); CloseAllConnections(); }
    }

    private void TrackConnection(TcpClient client)
    {
        lock (_connectionsSync) _connections.Add(client);
    }

    private void ReleaseConnection(TcpClient client)
    {
        lock (_connectionsSync) _connections.Remove(client);
        client.Dispose();
    }

    private void CloseAllConnections()
    {
        TcpClient[] sockets;
        lock (_connectionsSync) sockets = new System.Collections.Generic.List<TcpClient>(_connections).ToArray();
        foreach (var socket in sockets)
        {
            try { socket.Dispose(); }
            catch (ObjectDisposedException) { }
        }
    }

    /// <summary>Emitted only after an authenticated heartbeat; not a control permission.</summary>
    public event Action<string, DateTimeOffset>? PresenceHeartbeatReceived;

    private async Task HandlePairingAuditAsync(TcpClient client, PersistentManagedEnrollment registry, bool keepPresence = false, CancellationToken sessionStop = default)
    {
        // Closing the socket interrupts pending TLS reads immediately when the
        // listener is stopped, rather than waiting for the heartbeat timeout.
        using var cancelSocket = sessionStop.Register(static state =>
        {
            try { ((TcpClient)state!).Dispose(); }
            catch (ObjectDisposedException) { }
        }, client);
        bool accepted = false;
        string? validatedDeviceId = null;
        try
        {
            using (client)
            using (var tls = new SslStream(client.GetStream(), leaveInnerStreamOpen: false))
            using (var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10)))
            {
                await tls.AuthenticateAsServerAsync(new SslServerAuthenticationOptions
                {
                    ServerCertificate = _certificate,
                    ClientCertificateRequired = false,
                    EnabledSslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13,
                    CertificateRevocationCheckMode = X509RevocationMode.NoCheck
                }, timeout.Token).ConfigureAwait(false);
                if (!tls.IsAuthenticated || !tls.IsEncrypted || !tls.IsSigned)
                    throw new AuthenticationException("TLS authentication required");

                var idBytes = await ReadFrameAsync(tls, timeout.Token).ConfigureAwait(false);
                // Device identifiers must be canonical ASCII, not UTF-8 replacement characters.
                if (idBytes.Length is < 1 or > 64) return;
                foreach (byte b in idBytes)
                    if (!((b >= (byte)'A' && b <= (byte)'Z') ||
                          (b >= (byte)'a' && b <= (byte)'z') ||
                          (b >= (byte)'0' && b <= (byte)'9') || b == '-' || b == '_')) return;
                string deviceId = Encoding.ASCII.GetString(idBytes);
                validatedDeviceId = deviceId;
                byte[]? nonce;
                lock (_registrySync)
                    nonce = registry.IsLocked ? null : registry.IssueChallenge(deviceId, DateTimeOffset.UtcNow);
                if (nonce is null) return; // unknown or revoked device: no challenge
                await WriteFrameAsync(tls, nonce, timeout.Token).ConfigureAwait(false);
                byte[] signature = await ReadFrameAsync(tls, timeout.Token).ConfigureAwait(false);
                if (signature.Length is < 256 or > 1024) return;
                bool verified;
                lock (_registrySync)
                    verified = !registry.IsLocked && registry.VerifyOnce(deviceId, signature, DateTimeOffset.UtcNow);
                if (verified)
                {
                    accepted = true;
                    await WriteFrameAsync(tls, new byte[] { (byte)'O', (byte)'K' }, timeout.Token).ConfigureAwait(false);
                    if (keepPresence)
                    {
                        // The identity proof is complete; the 10-second handshake timeout
                        // must NOT govern the subsequent heartbeat session.
                        var presenceSessionId = Guid.NewGuid();
                        try { PresenceSessionChanged?.Invoke(deviceId, presenceSessionId, true); }
                        catch (Exception) { /* diagnostics only */ }
                        using var linked = CancellationTokenSource.CreateLinkedTokenSource(sessionStop);
                        try
                        {
                            await AuthenticatedPresenceProtocol.RunTeacherAsync(tls, timestamp =>
                            {
                                // A revoked device must not remain marked present.
                                lock (_registrySync)
                                {
                                    if (registry.IsLocked || !registry.GetRosterSnapshot().Enrolled.Contains(deviceId))
                                    {
                                        linked.Cancel();
                                        return;
                                    }
                                }
                                try { PresenceHeartbeatReceived?.Invoke(deviceId, timestamp); }
                                catch (Exception) { /* observers cannot affect the session */ }
                            }, linked.Token).ConfigureAwait(false);
                        }
                        catch (OperationCanceledException) when (linked.IsCancellationRequested) { }
                        finally
                        {
                            try { PresenceSessionChanged?.Invoke(deviceId, presenceSessionId, false); }
                            catch (Exception) { /* diagnostics only */ }
                        }
                    }
                }
                // Close after identity proof. No dispatch, no input injection, no session token.
                // In opt-in presence mode only, fixed-size heartbeat messages continue on TLS.
            }
        }
        catch (Exception ex) when (ex is IOException or AuthenticationException or OperationCanceledException or
                                   SocketException or InvalidDataException or ObjectDisposedException)
        {
            // Fail closed on malformed frames, timeouts, disconnects and TLS errors.
        }
        finally
        {
            if (accepted) Interlocked.Increment(ref _accepted);
            else Interlocked.Increment(ref _rejected);
            // Subscriber exceptions must never interrupt cleanup or change authorization.
            try { PairingAuditCompleted?.Invoke(new PairingAuditOutcome(validatedDeviceId, accepted, DateTimeOffset.UtcNow)); }
            catch (Exception) { /* diagnostic observer only */ }
            ReleaseConnection(client);
            _slots.Release();
        }
    }

    private static async Task<byte[]> ReadFrameAsync(Stream stream, CancellationToken ct)
    {
        byte[] prefix = new byte[4];
        await stream.ReadExactlyAsync(prefix, ct).ConfigureAwait(false);
        int length = BinaryPrimitives.ReadInt32BigEndian(prefix);
        if (length < 1 || length > MaxFrameBytes) throw new InvalidDataException("Invalid pairing frame length");
        byte[] bytes = new byte[length];
        await stream.ReadExactlyAsync(bytes, ct).ConfigureAwait(false);
        return bytes;
    }

    private static async Task WriteFrameAsync(Stream stream, byte[] bytes, CancellationToken ct)
    {
        if (bytes.Length < 1 || bytes.Length > MaxFrameBytes) throw new InvalidDataException("Invalid pairing frame length");
        byte[] prefix = new byte[4];
        BinaryPrimitives.WriteInt32BigEndian(prefix, bytes.Length);
        await stream.WriteAsync(prefix, ct).ConfigureAwait(false);
        await stream.WriteAsync(bytes, ct).ConfigureAwait(false);
        await stream.FlushAsync(ct).ConfigureAwait(false);
    }

    private async Task HandleAuditOnlyAsync(TcpClient client, CancellationToken sessionStop)
    {
        using var cancelSocket = sessionStop.Register(static state =>
        {
            try { ((TcpClient)state!).Dispose(); }
            catch (ObjectDisposedException) { }
        }, client);
        try
        {
            using (client)
            using (var tls = new SslStream(client.GetStream(), leaveInnerStreamOpen: false))
            using (var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10)))
            {
                await tls.AuthenticateAsServerAsync(new SslServerAuthenticationOptions
                {
                    ServerCertificate = _certificate,
                    ClientCertificateRequired = false, // pairing proof is not integrated yet
                    EnabledSslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13,
                    CertificateRevocationCheckMode = X509RevocationMode.NoCheck
                }, timeout.Token).ConfigureAwait(false);
                if (!tls.IsAuthenticated || !tls.IsEncrypted || !tls.IsSigned)
                    throw new AuthenticationException("Unauthenticated TLS session");
                // Deliberately do not read, acknowledge or dispatch any application frames.
                // A later phase must add registered-device proof and replay protection.
            }
        }
        catch (Exception ex) when (ex is IOException or AuthenticationException or OperationCanceledException or SocketException)
        {
            // Expected peer failures. Never log credentials or certificate private keys.
        }
        finally { ReleaseConnection(client); _slots.Release(); }
    }

    public ValueTask DisposeAsync()
    {
        if (_disposed) return ValueTask.CompletedTask;
        _disposed = true;
        _listener.Stop();
        CloseAllConnections();
        _certificate.Dispose();
        // Do not dispose _slots while active handlers may still release it.
        return ValueTask.CompletedTask;
    }
}

/// <summary>One completed identity check; no client address, key or signature is retained.</summary>
public sealed record PairingAuditOutcome(string? DeviceId, bool Accepted, DateTimeOffset Timestamp);
