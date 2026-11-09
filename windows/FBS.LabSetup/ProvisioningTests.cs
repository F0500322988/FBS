using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using FBS.Student.Native;
using FBS.Teacher.Launcher;

namespace FBS.LabSetup;

internal static class ProvisioningTests
{
    internal static void Run()
    {
        int checks = 0;
        void Check(bool condition, string name) { if (!condition) throw new Exception("FAIL: " + name); checks++; Console.WriteLine("PASS: " + name); }
        void Reject(Action action, string name) { bool failed = false; try { action(); } catch { failed = true; } Check(failed, name); }
        var temp = Path.Combine(Path.GetTempPath(), "fbs-lab-setup-" + Guid.NewGuid().ToString("N")); StudentProvisioning.MakePrivateDirectory(temp);
        // Only known fixture files are removed below; never use recursive deletion.
        var profile = new LabProfile(1, "192.168.50.2", 4180, new string('a', 64), "012"); profile.Validate();
        var file = Path.Combine(temp, "profile.json"); profile.WriteNew(file);
        Check(LabProfile.Read(file) == profile, "portable profile round trip");
        foreach (var host in new[] { "127.0.0.1", "127.1", "localhost", "x.localhost", "0.0.0.0", "169.254.2.3", "224.0.0.1", "255.255.255.255", "999.2.3.4", "teacher..local", "https://teacher", "teacher.local/", "teacher.local\n" })
            Reject(() => (profile with { TeacherHost = host }).Validate(), "reject unusable teacher address");
        foreach (var port in new[] { 0, 65536 }) Reject(() => (profile with { TeacherPort = port }).Validate(), "reject port");
        Reject(() => (profile with { Fingerprint = "bad" }).Validate(), "reject fingerprint");
        Reject(() => (profile with { PairingKey = "short" }).Validate(), "reject short key");
        Reject(() => (profile with { PairingKey = new string('a', 257) }).Validate(), "cross-platform key bound");
        Reject(() => (profile with { PairingKey = "fixture-key-with\nnewline" }).Validate(), "no control characters");
        var invalid = Path.Combine(temp, "invalid.json");
        File.WriteAllText(invalid, JsonSerializer.Serialize(profile, LabProfile.Json).Replace("\"version\": 1", "\"version\": 1, \"deviceId\": \"CLONE\""));
        Reject(() => LabProfile.Read(invalid), "no device identity in portable profile");
        File.WriteAllText(invalid, File.ReadAllText(file).Replace("\"version\": 1", "\"version\": 1, \"version\": 1")); Reject(() => LabProfile.Read(invalid), "duplicate fields rejected");
        File.WriteAllText(invalid, new string('a', 8193)); Reject(() => LabProfile.Read(invalid), "oversized profile rejected");
        var state = Path.Combine(temp, "state");
        Check(StudentProvisioning.Apply(profile, state) == "configured", "import into fresh student state");
        Check(StudentPairingKeyStore.OpenExisting(Path.Combine(state, "pairing.dpapi")) == profile.PairingKey, "native student decrypts imported DPAPI key");
        Check(StudentTeacherConnectionSettings.Load(Path.Combine(state, "teacher-endpoint.json")) == profile.Endpoint, "native student loads exact pinned endpoint");
        Check(!File.ReadAllText(Path.Combine(state, "pairing.dpapi")).Contains(profile.PairingKey), "no clear key in persisted DPAPI file");
        var marker = Path.Combine(state, "device-identity.json"); File.WriteAllText(marker, "fixture-owned-identity");
        Check(StudentProvisioning.Apply(profile, state) == "unchanged", "same profile import is idempotent");
        Check(File.ReadAllText(marker) == "fixture-owned-identity", "existing device identity preserved");
        var originalKey = File.ReadAllBytes(Path.Combine(state, "pairing.dpapi"));
        Reject(() => StudentProvisioning.Apply(profile with { PairingKey = "different-fixture-key-184" }, state), "different key cannot replace current lab");
        Reject(() => StudentProvisioning.Apply(profile with { TeacherHost = "192.168.60.2" }, state), "different teacher cannot replace current lab");
        Check(originalKey.SequenceEqual(File.ReadAllBytes(Path.Combine(state, "pairing.dpapi"))), "rejected imports preserve key bytes");
        var lockPath = Path.Combine(state, ".lab-setup.lock"); using (var locked = new FileStream(lockPath, FileMode.CreateNew, FileAccess.ReadWrite, FileShare.None, 1, FileOptions.DeleteOnClose))
            Reject(() => StudentProvisioning.Apply(profile, state), "concurrent import cannot acquire lock");
        File.Delete(Path.Combine(state, "teacher-endpoint.json")); Reject(() => StudentProvisioning.Apply(profile, state), "partial existing state is not overwritten");
        profile.Endpoint.SaveNew(Path.Combine(state, "teacher-endpoint.json"));
        using var rsa = RSA.Create(2048); var request = new CertificateRequest("CN=FBS owned provisioning fixture", rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        using var cert = request.CreateSelfSigned(DateTimeOffset.UtcNow.AddMinutes(-1), DateTimeOffset.UtcNow.AddDays(1));
        var certPath = Path.Combine(temp, "cert.pem"); var privatePath = Path.Combine(temp, "key.pem");
        File.WriteAllText(certPath, cert.ExportCertificatePem()); File.WriteAllText(privatePath, rsa.ExportPkcs8PrivateKeyPem());
        var saved = new TeacherConnectionSettings(1, profile.PairingKey, "fixture-only-teacher-password", certPath, privatePath); var teacher = Path.Combine(temp, "teacher"); saved.SaveNew(teacher);
        var fromStore = TeacherConnectionSettings.Load(teacher)!; var exported = Program.FromTeacher(fromStore, profile.TeacherHost);
        Check(exported.Fingerprint == Convert.ToHexString(SHA256.HashData(cert.RawData)).ToLowerInvariant(), "teacher export uses actual certificate SHA256");
        var raw = JsonSerializer.Serialize(exported, LabProfile.Json); Check(!raw.Contains(saved.Password) && !raw.Contains("PRIVATE KEY") && !raw.Contains("CertificatePath"), "teacher password and private certificate material excluded");
        var templates = Path.Combine(temp, "templates"); Directory.CreateDirectory(templates);
        foreach (var name in Program.KitFiles) File.WriteAllText(Path.Combine(templates, name), "owned fixture");
        var kit = Path.Combine(temp, "kit"); Program.Export(fromStore, profile.TeacherHost, kit, templates);
        Check(LabProfile.Read(Path.Combine(kit, "lab-profile.json")) == exported, "complete private student kit export");
        Reject(() => Program.Export(fromStore, profile.TeacherHost, kit, templates), "export never replaces an existing folder");
        File.Delete(Path.Combine(templates, Program.KitFiles[0])); Reject(() => Program.Export(fromStore, profile.TeacherHost, Path.Combine(temp, "missing"), templates), "incomplete template rejected before export");
        foreach (var path in new[] { state, teacher, templates, kit }) { foreach (var p in Directory.GetFiles(path)) File.Delete(p); Directory.Delete(path, false); }
        foreach (var p in Directory.GetFiles(temp)) File.Delete(p); Directory.Delete(temp, false);
        Console.WriteLine(JsonSerializer.Serialize(new { stage = "M184", windowsProvisioningChecks = checks, dpapiRoundTripPassed = true, nativeStudentCompatibilityPassed = true, actualUserLabTested = false, secretsPrinted = false }));
    }
}
