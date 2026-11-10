using System.Security.AccessControl;
using System.Security.Cryptography;

namespace FBS.Teacher.Launcher;

internal static class TeacherAutomaticSetup
{
    internal static TeacherConnectionSettings LoadOrCreate()
    {
        var saved = TeacherConnectionSettings.Load();
        if (saved is not null) return saved;
        var directory = Path.Combine(TeacherConnectionSettings.StateDirectory, "certificates", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        var acl = new System.Security.AccessControl.DirectorySecurity();
        acl.SetAccessRuleProtection(true, false);
        var user = System.Security.Principal.WindowsIdentity.GetCurrent().User
            ?? throw new UnauthorizedAccessException("Windows account unavailable");
        acl.AddAccessRule(new System.Security.AccessControl.FileSystemAccessRule(user,
            System.Security.AccessControl.FileSystemRights.FullControl,
            System.Security.AccessControl.InheritanceFlags.ContainerInherit | System.Security.AccessControl.InheritanceFlags.ObjectInherit,
            System.Security.AccessControl.PropagationFlags.None, System.Security.AccessControl.AccessControlType.Allow));
        new DirectoryInfo(directory).SetAccessControl(acl);
        var generated = TeacherCertificateFactory.Create(System.Net.Dns.GetHostName());
        var cert = Path.Combine(directory, "teacher-cert.pem");
        var key = Path.Combine(directory, "teacher-key.pem");
        File.WriteAllText(cert, generated.CertificatePem);
        File.WriteAllText(key, generated.PrivateKeyPem);
        var settings = new TeacherConnectionSettings(1, Convert.ToHexString(RandomNumberGenerator.GetBytes(32)),
            Convert.ToHexString(RandomNumberGenerator.GetBytes(32)), cert, key);
        settings.SaveNew();
        return settings;
    }

}
