using System.Net;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using FBS.Teacher.Launcher;
using FBS.Student.Native;

int passed = 0;
void Check(bool ok, string name) { if (!ok) throw new Exception("FAIL: " + name); Console.WriteLine("PASS: " + name); passed++; }
foreach (var pin in new[] { "012", "0123", "01234", "012345", "0123456", "01234567" })
    Check(CredentialPolicy.IsPin(pin), "eight digit PIN preserves leading zero");
foreach (var value in new[] { "12", "1", "123456789", "abcdefgh", "1234 678", "012\n", "012\r", "12345678\n", "" })
    Check(!CredentialPolicy.IsPin(value), "reject invalid new PIN");
Check(CredentialPolicy.NormalizeDigits("٠١٢٣٤٥٦٧") == "01234567", "normalize Arabic digits");
Check(CredentialPolicy.NormalizeDigits("۰۱۲۳۴۵۶۷") == "01234567", "normalize Persian digits");
Check(CredentialPolicy.IsStoredKey("01234567") && CredentialPolicy.IsStoredPassword("01234567"), "eight digits accepted by stored configuration");
Check(CredentialPolicy.IsStoredKey("existing-legacy-key") && CredentialPolicy.IsStoredPassword("existing-legacy-password"), "legacy configuration remains readable");
Check(AgentReadiness.IsReady(HttpStatusCode.OK, "{\"inputEnabled\":false,\"session\":null}"), "student agent empty-session readiness accepted");
Check(AgentReadiness.IsReady(HttpStatusCode.OK, "{\"inputEnabled\":false,\"session\":{\"sessionId\":\"fixture\"}}"), "student agent active-session readiness accepted");
foreach (var body in new[] { "{}", "[]", "broken", "{\"inputEnabled\":true,\"session\":null}", "{\"inputEnabled\":false,\"session\":\"invalid\"}", new string('x', 8193) })
    Check(!AgentReadiness.IsReady(HttpStatusCode.OK, body), "reject malformed or unsafe student readiness");
Check(!AgentReadiness.IsReady(HttpStatusCode.Forbidden, "{\"inputEnabled\":false,\"session\":null}"), "reject readiness without successful authentication");
var endpointDirectory = Path.Combine(Path.GetTempPath(), "fbs-endpoint-" + Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(endpointDirectory);
try
{
    var file = Path.Combine(endpointDirectory, "teacher.json");
    var endpoint = new StudentTeacherConnectionSettings(1, false, "127.0.0.1", 4180, new string('A', 64));
    Check(StudentTeacherConnectionSettings.Load(file) is null, "no invented manual teacher endpoint");
    endpoint.SaveNew(file);
    Check(StudentTeacherConnectionSettings.Load(file) == endpoint, "manual teacher endpoint round trip");
    bool refused = false;
    try { endpoint.SaveNew(file); } catch (IOException) { refused = true; }
    Check(refused && StudentTeacherConnectionSettings.Load(file) == endpoint, "teacher endpoint is not overwritten implicitly");
    var info = new System.Diagnostics.ProcessStartInfo();
    endpoint.Apply(info);
    Check(info.Environment["FBS_TEACHER_HOST"] == "127.0.0.1" && info.Environment["FBS_TEACHER_PORT"] == "4180" && info.Environment["FBS_TEACHER_FINGERPRINT"] == new string('a', 64), "manual endpoint applies complete normalized child environment");
    var automatic = new StudentTeacherConnectionSettings(1, true, "", 0, "");
    automatic.Apply(info);
    Check(!info.Environment.ContainsKey("FBS_TEACHER_HOST") && !info.Environment.ContainsKey("FBS_TEACHER_PORT") && !info.Environment.ContainsKey("FBS_TEACHER_FINGERPRINT"), "explicit discovery clears inherited partial manual settings");
    automatic.ReplaceExisting(endpoint, file);
    Check(StudentTeacherConnectionSettings.Load(file) == automatic, "explicitly saved endpoint edit is persisted atomically");
    refused = false;
    try { endpoint.ReplaceExisting(endpoint, file); } catch (IOException) { refused = true; }
    Check(refused && StudentTeacherConnectionSettings.Load(file) == automatic, "stale connection dialog cannot overwrite a changed configuration");
    foreach (var invalid in new[]
    {
        endpoint with { Version = 2 }, endpoint with { Host = "https://teacher" }, endpoint with { Host = "teacher..lab" },
        endpoint with { Host = "teacher/path" }, endpoint with { Port = 0 }, endpoint with { Port = 65536 },
        endpoint with { Fingerprint = "" }, automatic with { Host = "partial" }
    })
    {
        refused = false;
        try { invalid.Validate(); } catch (InvalidDataException) { refused = true; }
        Check(refused, "reject incomplete or invalid persisted teacher endpoint");
    }
    File.WriteAllText(file, "{\"Version\":1,\"Discovery\":false,\"Host\":\"teacher\",\"Port\":4180,\"Fingerprint\":\"\"}");
    refused = false;
    try { StudentTeacherConnectionSettings.Load(file); } catch (InvalidDataException) { refused = true; }
    Check(refused, "invalid manual pin does not silently fall back to discovery");
}
finally { Directory.Delete(endpointDirectory, true); }
foreach (var host in new[] { "teacher.lab.example", "192.168.1.10" })
{
    var generated = TeacherCertificateFactory.Create(host);
    using var pemCertificate = X509Certificate2.CreateFromPem(generated.CertificatePem, generated.PrivateKeyPem);
    // Schannel requires a persisted-key import for this test's TLS server.
    using var certificate = new X509Certificate2(pemCertificate.Export(X509ContentType.Pfx), (string?)null, X509KeyStorageFlags.UserKeySet);
    Check(certificate.HasPrivateKey, host + ": certificate and private key match");
    Check(certificate.NotBefore.ToUniversalTime() < DateTime.UtcNow && certificate.NotAfter.ToUniversalTime() > DateTime.UtcNow.AddDays(360), host + ": valid lifetime");
    Check(Convert.ToHexString(SHA256.HashData(certificate.RawData)) == generated.Fingerprint, host + ": fingerprint matches certificate");
    var san = new X509SubjectAlternativeNameExtension(certificate.Extensions["2.5.29.17"]!.RawData);
    Check(IPAddress.TryParse(host, out var ip) ? san.EnumerateIPAddresses().Contains(ip) : san.EnumerateDnsNames().Contains(host), host + ": correct subject alternative name");
    var constraints = certificate.Extensions.OfType<X509BasicConstraintsExtension>().Single();
    Check(!constraints.CertificateAuthority, host + ": is not a certificate authority");
    using var key = certificate.GetRSAPrivateKey()!;
    var message = RandomNumberGenerator.GetBytes(32);
    var signature = key.SignData(message, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
    using var publicKey = certificate.GetRSAPublicKey()!;
    Check(publicKey.VerifyData(message, signature, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1), host + ": key can prove possession");
}
foreach (var invalid in new[] { "", " ", " teacher", "https://teacher", "teacher/path", "teacher:47443" })
{
    bool rejected = false;
    try { TeacherCertificateFactory.Create(invalid); } catch (ArgumentException) { rejected = true; }
    Check(rejected, "reject invalid host: " + invalid);
}
var first = TeacherCertificateFactory.Create("teacher.lab.example");
var second = TeacherCertificateFactory.Create("teacher.lab.example");
Check(first.Fingerprint != second.Fingerprint, "fresh certificate gets a fresh key and fingerprint");
Console.WriteLine($"Setup certificate checks: {passed} passed.");

async Task TlsTrial(string certificateHost, bool wrongPin, bool shouldConnect)
{
    var generated = TeacherCertificateFactory.Create(certificateHost);
    using var pemCertificate = X509Certificate2.CreateFromPem(generated.CertificatePem, generated.PrivateKeyPem);
    // Schannel requires a persisted-key import for this test's TLS server.
    using var certificate = new X509Certificate2(pemCertificate.Export(X509ContentType.Pfx), (string?)null, X509KeyStorageFlags.UserKeySet);
    using var listener = new System.Net.Sockets.TcpListener(IPAddress.Loopback, 0);
    listener.Start();
    using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
    int port = ((IPEndPoint)listener.LocalEndpoint).Port;
    var serving = Task.Run(async () =>
    {
        using var socket = await listener.AcceptTcpClientAsync(timeout.Token);
        await using var tls = new System.Net.Security.SslStream(socket.GetStream());
        try
        {
            await tls.AuthenticateAsServerAsync(new System.Net.Security.SslServerAuthenticationOptions
            {
                ServerCertificate = certificate,
                EnabledSslProtocols = System.Security.Authentication.SslProtocols.Tls12 | System.Security.Authentication.SslProtocols.Tls13
            }, timeout.Token);
            if (shouldConnect)
            {
                byte[] frame = new byte[7];
                await tls.ReadExactlyAsync(frame, timeout.Token);
                await tls.WriteAsync(frame, timeout.Token);
                await tls.FlushAsync(timeout.Token);
            }
        }
        catch (System.Security.Authentication.AuthenticationException) when (!shouldConnect) { }
        catch (IOException) when (!shouldConnect) { }
    });
    bool connected = false;
    try
    {
        var pin = wrongPin ? new byte[32] : Convert.FromHexString(generated.Fingerprint);
        await using var channel = await PinnedLanTlsChannel.ConnectAsync("localhost", port, pin, timeout.Token);
        connected = true;
        if (shouldConnect)
        {
            await channel.SendFrameAsync(new byte[] { 1, 2, 3 }, timeout.Token);
            Check((await channel.ReceiveFrameAsync(timeout.Token)).SequenceEqual(new byte[] { 1, 2, 3 }), "pinned TLS framed round trip");
        }
    }
    catch (System.Security.Authentication.AuthenticationException) when (!shouldConnect) { }
    await serving;
    Check(connected == shouldConnect, $"TLS connection expected={shouldConnect}, certificateHost={certificateHost}, wrongPin={wrongPin}");
}
await TlsTrial("localhost", false, true);
await TlsTrial("localhost", true, false);
await TlsTrial("other.lab.example", false, false);
Console.WriteLine($"Setup and local TLS checks: {passed} passed. Windows DPAPI/UI and two-PC LAN remain untested.");
