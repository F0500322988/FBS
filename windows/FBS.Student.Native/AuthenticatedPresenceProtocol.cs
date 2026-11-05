using System;
using System.Buffers.Binary;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace FBS.Student.Native;

/// <summary>
/// M163: presence-only protocol for an ALREADY authenticated, encrypted stream.
/// Callers MUST complete certificate pinning and registered-device challenge proof first.
/// Never dispatches arbitrary commands or remote input. One reader and one writer per stream.
/// </summary>
public static class AuthenticatedPresenceProtocol
{
    public const byte Ping = 0x50;
    public const byte Pong = 0x51;
    public const byte Stop = 0x53;
    public static readonly TimeSpan HeartbeatInterval = TimeSpan.FromSeconds(10);
    public static readonly TimeSpan ResponseTimeout = TimeSpan.FromSeconds(5);
    public const int MaxMissedHeartbeats = 2;

    /// <summary>Student side. Closing the supplied cancellation token stops the session.</summary>
    public static async Task RunStudentAsync(Stream authenticatedTls, CancellationToken stopToken)
    {
        ArgumentNullException.ThrowIfNull(authenticatedTls);
        if (!authenticatedTls.CanRead || !authenticatedTls.CanWrite)
            throw new InvalidOperationException("Authenticated TLS stream must be readable and writable");
        byte[] message = new byte[9];
        byte[] reply = new byte[9];
        try
        {
            while (true)
            {
                stopToken.ThrowIfCancellationRequested();
                message[0] = Ping;
                System.Security.Cryptography.RandomNumberGenerator.Fill(message.AsSpan(1));
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(stopToken);
                timeout.CancelAfter(ResponseTimeout);
                await authenticatedTls.WriteAsync(message, timeout.Token).ConfigureAwait(false);
                await authenticatedTls.FlushAsync(timeout.Token).ConfigureAwait(false);
                await authenticatedTls.ReadExactlyAsync(reply, timeout.Token).ConfigureAwait(false);
                if (reply[0] != Pong || !System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(message.AsSpan(1), reply.AsSpan(1)))
                    throw new InvalidDataException("Invalid authenticated presence response");
                await Task.Delay(HeartbeatInterval, stopToken).ConfigureAwait(false);
            }
        }
        finally
        {
            // A stop request must not wait on the network: dispose stream at the caller boundary.
            System.Security.Cryptography.CryptographicOperations.ZeroMemory(message);
            System.Security.Cryptography.CryptographicOperations.ZeroMemory(reply);
        }
    }

    /// <summary>Teacher side. Exits on stop, disconnect, bad frame or missed heartbeat.</summary>
    public static async Task RunTeacherAsync(Stream authenticatedTls, Action<DateTimeOffset> onHeartbeat, CancellationToken stopToken)
    {
        ArgumentNullException.ThrowIfNull(authenticatedTls);
        ArgumentNullException.ThrowIfNull(onHeartbeat);
        if (!authenticatedTls.CanRead || !authenticatedTls.CanWrite)
            throw new InvalidOperationException("Authenticated TLS stream must be readable and writable");
        byte[] message = new byte[9];
        byte[] response = new byte[9];
        try
        {
            while (true)
            {
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(stopToken);
                timeout.CancelAfter(TimeSpan.FromTicks(HeartbeatInterval.Ticks * MaxMissedHeartbeats + ResponseTimeout.Ticks));
                await authenticatedTls.ReadExactlyAsync(message, timeout.Token).ConfigureAwait(false);
                if (message[0] != Ping) throw new InvalidDataException("Unexpected presence message");
                response[0] = Pong;
                message.AsSpan(1).CopyTo(response.AsSpan(1));
                await authenticatedTls.WriteAsync(response, timeout.Token).ConfigureAwait(false);
                await authenticatedTls.FlushAsync(timeout.Token).ConfigureAwait(false);
                onHeartbeat(DateTimeOffset.UtcNow);
            }
        }
        finally
        {
            System.Security.Cryptography.CryptographicOperations.ZeroMemory(message);
            System.Security.Cryptography.CryptographicOperations.ZeroMemory(response);
        }
    }
}
