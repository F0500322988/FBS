using System.Diagnostics;
using System.Security.Cryptography;
using FBS.Teacher.Launcher;
using FBS.Student.Native;

if (!OperatingSystem.IsWindows()) throw new PlatformNotSupportedException("Run these DPAPI checks on Windows");
var root = Path.Combine(Path.GetTempPath(), "fbs-setup-test-" + Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(root);
int passed = 0;
var checks = new List<object>();
bool successful = false;
string? failure = null;
void Check(bool ok, string name) { checks.Add(new { name, passed = ok }); if (!ok) { Console.Error.WriteLine("FAIL: " + name); throw new Exception("FAIL: " + name); } Console.WriteLine("PASS: " + name); passed++; }
try
{
    var cert = TeacherCertificateFactory.Create("teacher.lab.example");
    var certificate = Path.Combine(root, "teacher.pem");
    var keyFile = Path.Combine(root, "key.pem");
    File.WriteAllText(certificate, cert.CertificatePem);
    File.WriteAllText(keyFile, cert.PrivateKeyPem);
    string labKey = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    string password = Convert.ToHexString(RandomNumberGenerator.GetBytes(20));
    var settings = new TeacherConnectionSettings(1, labKey, password, certificate, keyFile);
    Check(TeacherConnectionSettings.Load(root) is null, "missing teacher configuration is not silently invented");
    settings.SaveNew(root);
    Check(TeacherConnectionSettings.Load(root) == settings, "teacher DPAPI settings round trip");
    bool rejected = false;
    try { settings.SaveNew(root); } catch (IOException) { rejected = true; }
    Check(rejected && TeacherConnectionSettings.Load(root) == settings, "existing settings survive refused overwrite");
    var startInfo = new ProcessStartInfo();
    settings.Apply(startInfo);
    Check(startInfo.Environment["FBS_PAIRING_KEY"] == labKey && startInfo.Environment["FBS_TEACHER_PASSWORD"] == password, "settings apply to child process only");
    var vault = Path.Combine(root, "connection.dpapi");
    var blob = File.ReadAllBytes(vault);
    blob[blob.Length / 2] ^= 1;
    File.WriteAllBytes(vault, blob);
    rejected = false;
    try { TeacherConnectionSettings.Load(root); } catch (CryptographicException) { rejected = true; }
    Check(rejected, "tampered teacher DPAPI settings rejected");

    var pairingFile = Path.Combine(root, "pairing.dpapi");
    StudentPairingKeyStore.SaveNew(pairingFile, labKey);
    Check(StudentPairingKeyStore.OpenExisting(pairingFile) == labKey, "student key decrypts directly for native Node launch");
    File.AppendAllText(pairingFile, "\r\n");
    Check(StudentPairingKeyStore.OpenExisting(pairingFile) == labKey, "legacy PowerShell key-file newline is accepted");
    rejected = false;
    try { StudentPairingKeyStore.SaveNew(pairingFile, labKey); } catch (IOException) { rejected = true; }
    Check(rejected, "student pairing key is never overwritten implicitly");
    var command = new ProcessStartInfo("powershell.exe") { UseShellExecute = false, CreateNoWindow = true, RedirectStandardError = true };
    command.ArgumentList.Add("-NoProfile"); command.ArgumentList.Add("-NonInteractive"); command.ArgumentList.Add("-Command");
    command.ArgumentList.Add("try { $ErrorActionPreference='Stop'; $s=(Get-Content -LiteralPath $env:FBS_TEST_KEY_FILE -Raw).Trim() | ConvertTo-SecureString; $p=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s); try { if ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($p) -cne $env:FBS_TEST_EXPECTED) { exit 2 } } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p) } } catch { [Console]::Error.WriteLine(\"FAIL: PowerShell error category \" + $_.CategoryInfo.Category + \" type \" + $_.Exception.GetType().FullName); exit 3 }");
    // The CI parent is PowerShell 7; its module path hides Windows PowerShell 5 modules.
    // Let the legacy child initialize its own system module path.
    command.Environment.Remove("PSModulePath");
    command.Environment["FBS_TEST_KEY_FILE"] = pairingFile;
    command.Environment["FBS_TEST_EXPECTED"] = labKey; // Random disposable fixture, never printed.
    using var process = Process.Start(command)!;
    if (!process.WaitForExit(15000)) { process.Kill(true); throw new TimeoutException("PowerShell compatibility test timed out"); }
    Console.Error.WriteLine(process.StandardError.ReadToEnd());
    Console.WriteLine("PowerShell compatibility exit code: " + process.ExitCode);
    if (process.ExitCode != 0) Console.Error.WriteLine("FAIL: PowerShell compatibility exit code " + process.ExitCode);
    Check(process.ExitCode == 0, "student key remains compatible with the legacy PowerShell launcher format");
    var damagedKey = Path.Combine(root, "damaged-pairing.dpapi");
    File.WriteAllText(damagedKey, new string('z', 128));
    rejected = false;
    try { StudentPairingKeyStore.OpenExisting(damagedKey); } catch (InvalidDataException) { rejected = true; }
    Check(rejected, "student malformed key envelope rejected");
    var malformedPath = Path.Combine(root, "malformed-admin.dpapi");
    var malformed = System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(new
    {
        Version = 1, Salt = (byte[]?)null, Verifier = new byte[32], RegistryKey = new byte[32], LockoutKey = new byte[32]
    });
    var entropy = "FBS-Classroom/admin-credential-v1"u8.ToArray();
    File.WriteAllBytes(malformedPath, ProtectedData.Protect(malformed, entropy, DataProtectionScope.CurrentUser));
    CryptographicOperations.ZeroMemory(malformed);
    rejected = false;
    try { WindowsAdminCredentialVault.OpenExisting(malformedPath); } catch (InvalidDataException) { rejected = true; }
    Check(rejected, "malformed administrator record with null salt fails closed");
    Console.WriteLine($"Windows setup checks: {passed} passed.");
    successful = true;
}
catch (Exception ex)
{
    failure = ex.GetType().Name;
    Console.Error.WriteLine("Windows setup checks failed: " + failure);
    Environment.ExitCode = 1;
}
finally
{
    Directory.Delete(root, recursive: true);
    if (args.Length == 1)
    {
        var reportPath = Path.GetFullPath(args[0]);
        Directory.CreateDirectory(Path.GetDirectoryName(reportPath)!);
        File.WriteAllText(reportPath, System.Text.Json.JsonSerializer.Serialize(new
        {
            stage = "M177", generatedAt = DateTimeOffset.UtcNow, passed = successful,
            passedCount = passed, guiTested = false, twoPcLanTested = false, checks, failure
        }, new System.Text.Json.JsonSerializerOptions { WriteIndented = true }));
        Console.WriteLine("A secret-free JSON report was saved.");
    }
}
