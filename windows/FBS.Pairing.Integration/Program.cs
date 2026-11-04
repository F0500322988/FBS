using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Threading;
using System.Threading.Tasks;
using FBS.Student.Native;
using FBS.Teacher.Launcher;

// M158: real .NET loopback integration smoke test, opt-in and identity-only.
// Requires Windows + .NET 8. Uses disposable test keys, certificate, and registry.
internal static class Program
{
    private static async Task<int> Main()
    {
        string directory = Path.Combine(Path.GetTempPath(), "FBS-M158-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        try
        {
            using RSA deviceKey = RSA.Create(2048);
            using RSA unregisteredKey = RSA.Create(2048);
            using RSA certKey = RSA.Create(2048);
            var request = new CertificateRequest("CN=localhost", certKey, HashAlgorithmName.SHA256,
                RSASignaturePadding.Pkcs1);
            var san = new SubjectAlternativeNameBuilder();
            san.AddDnsName("localhost");
            request.CertificateExtensions.Add(san.Build());
            request.CertificateExtensions.Add(new X509BasicConstraintsExtension(false, false, 0, true));
            request.CertificateExtensions.Add(new X509KeyUsageExtension(X509KeyUsageFlags.DigitalSignature, true));
            using X509Certificate2 certificate = request.CreateSelfSigned(DateTimeOffset.UtcNow.AddMinutes(-5),
                DateTimeOffset.UtcNow.AddHours(1));
            byte[] pin = SHA256.HashData(certificate.RawData);
            byte[] registryKey = RandomNumberGenerator.GetBytes(32);
            string registryPath = Path.Combine(directory, "test-registry.enc");
            var registry = PersistentManagedEnrollment.InitializeNew(registryPath, registryKey, administratorAuthenticated: true);
            if (!registry.Provision("test-student", deviceKey.ExportSubjectPublicKeyInfo(), true))
                throw new Exception("Failed to enroll test device");
            await using var listener = new TeacherPinnedTlsListener(IPAddress.Loopback, ReserveLoopbackPort(), certificate);
            // ReserveLoopbackPort() releases the port before binding. A rare external race
            // may cause the listener to fail; retrying the test with a new port is safe.
            int port = _selectedPort;
            using var cancel = new CancellationTokenSource();
            Task server = listener.RunPairingAuditAsync(registry, cancel.Token);
            try
            {
                bool accepted = await PinnedLanPairingClient.ProveIdentityAsync("localhost", port, pin,
                    "test-student", deviceKey);
                if (!accepted) throw new Exception("Approved device failed authentication");
                Console.WriteLine("PASS: registered device accepted");

                bool rejected = await AttemptProofAsync("localhost", port, pin,
                    "test-student", unregisteredKey);
                if (rejected) throw new Exception("Wrong private key was accepted");
                Console.WriteLine("PASS: wrong signing key rejected");

                bool unknown = await AttemptProofAsync("localhost", port, pin,
                    "unknown-device", unregisteredKey);
                if (unknown) throw new Exception("Unknown device was accepted");
                Console.WriteLine("PASS: unknown device rejected");

                byte[] badPin = (byte[])pin.Clone();
                badPin[0] ^= 0xff;
                bool pinRejected = false;
                try
                {
                    await PinnedLanPairingClient.ProveIdentityAsync("localhost", port, badPin,
                        "test-student", deviceKey);
                }
                catch (System.Security.Authentication.AuthenticationException) { pinRejected = true; }
                catch (IOException) { pinRejected = true; }
                if (!pinRejected) throw new Exception("Incorrect server certificate pin accepted");
                Console.WriteLine("PASS: wrong certificate fingerprint rejected");
            }
            finally
            {
                cancel.Cancel();
                await listener.DisposeAsync();
                await server;
                CryptographicOperations.ZeroMemory(pin);
                CryptographicOperations.ZeroMemory(registryKey);
            }
            Console.WriteLine("PASS: M158 loopback integration checks completed");
            return 0;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine("FAIL: " + error.GetType().Name + ": " + error.Message);
            return 1;
        }
        finally
        {
            try { Directory.Delete(directory, recursive: true); }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
        }
    }

    private static async Task<bool> AttemptProofAsync(string host, int port, byte[] pin, string id, RSA key)
    {
        try { return await PinnedLanPairingClient.ProveIdentityAsync(host, port, pin, id, key); }
        catch (EndOfStreamException) { return false; } // server closes without OK on failed proof
        catch (IOException) { return false; }
    }

    private static int _selectedPort;
    private static int ReserveLoopbackPort()
    {
        var probe = new TcpListener(IPAddress.Loopback, 0);
        probe.Start();
        try
        {
            _selectedPort = ((IPEndPoint)probe.LocalEndpoint).Port;
            return _selectedPort;
        }
        finally { probe.Stop(); }
    }
}
