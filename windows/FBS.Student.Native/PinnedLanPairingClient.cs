using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace FBS.Student.Native;

/// <summary>
/// M155 opt-in proof of device identity over a certificate-pinned TLS channel.
/// The teacher's registry must already contain this device's public key.
/// Success is NOT permission to remotely operate a student device.
/// No connection or private-key creation occurs automatically.
/// </summary>
public static class PinnedLanPairingClient
{
    public static async Task<bool> ProveIdentityAsync(
        string host, int port, byte[] expectedServerCertificateSha256,
        string deviceId, RSA devicePrivateKey, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(devicePrivateKey);
        if (!ValidId(deviceId)) throw new ArgumentException("Invalid device identifier", nameof(deviceId));
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(10));
        await using var channel = await PinnedLanTlsChannel.ConnectAsync(
            host, port, expectedServerCertificateSha256, timeout.Token).ConfigureAwait(false);
        await channel.SendFrameAsync(Encoding.ASCII.GetBytes(deviceId), timeout.Token).ConfigureAwait(false);
        byte[] nonce = await channel.ReceiveFrameAsync(timeout.Token).ConfigureAwait(false);
        if (nonce.Length != DeviceChallengeProof.ChallengeBytes) return false;
        byte[] signature = DeviceChallengeProof.Sign(devicePrivateKey, nonce);
        try
        {
            await channel.SendFrameAsync(signature, timeout.Token).ConfigureAwait(false);
            byte[] reply = await channel.ReceiveFrameAsync(timeout.Token).ConfigureAwait(false);
            return reply.Length == 2 && reply[0] == (byte)'O' && reply[1] == (byte)'K';
        }
        finally
        {
            CryptographicOperations.ZeroMemory(nonce);
            CryptographicOperations.ZeroMemory(signature);
        }
    }

    /// <summary>Opt-in continuous presence. Returns only when stopped or disconnected.
    /// A successful identity proof is required before sending any heartbeat bytes.</summary>
    public static async Task RunPresenceAsync(
        string host, int port, byte[] expectedServerCertificateSha256,
        string deviceId, RSA devicePrivateKey, CancellationToken stopToken)
    {
        ArgumentNullException.ThrowIfNull(devicePrivateKey);
        if (!ValidId(deviceId)) throw new ArgumentException("Invalid device identifier", nameof(deviceId));
        stopToken.ThrowIfCancellationRequested();
        await using var channel = await PinnedLanTlsChannel.ConnectAsync(
            host, port, expectedServerCertificateSha256, stopToken).ConfigureAwait(false);
        using (var handshake = CancellationTokenSource.CreateLinkedTokenSource(stopToken))
        {
            handshake.CancelAfter(TimeSpan.FromSeconds(10));
            await channel.SendFrameAsync(Encoding.ASCII.GetBytes(deviceId), handshake.Token).ConfigureAwait(false);
            byte[] nonce = await channel.ReceiveFrameAsync(handshake.Token).ConfigureAwait(false);
            if (nonce.Length != DeviceChallengeProof.ChallengeBytes)
                throw new System.IO.InvalidDataException("Invalid server challenge");
            try
            {
                byte[] signature = DeviceChallengeProof.Sign(devicePrivateKey, nonce);
                try
                {
                    await channel.SendFrameAsync(signature, handshake.Token).ConfigureAwait(false);
                    byte[] result = await channel.ReceiveFrameAsync(handshake.Token).ConfigureAwait(false);
                    if (result.Length != 2 || result[0] != (byte)'O' || result[1] != (byte)'K')
                        throw new System.Security.Authentication.AuthenticationException("Device proof rejected");
                }
                finally { CryptographicOperations.ZeroMemory(signature); }
            }
            finally { CryptographicOperations.ZeroMemory(nonce); }
        }
        await channel.RunVerifiedPresenceAsync(stopToken).ConfigureAwait(false);
    }

    private static bool ValidId(string? id)
    {
        if (string.IsNullOrEmpty(id) || id.Length > 64) return false;
        foreach (char c in id)
            if (!((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') ||
                  (c >= '0' && c <= '9') || c is '-' or '_')) return false;
        return true;
    }
}
