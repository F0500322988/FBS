using System.Security.AccessControl;
using System.Security.Principal;
using FBS.Student.Native;

namespace FBS.LabSetup;

internal static class StudentProvisioning
{
    internal static void MakePrivateDirectory(string path)
    {
        FileSafety.DirectoryWithoutLinks(path);
        if (Directory.Exists(path) || File.Exists(path)) throw new IOException("Output already exists.");
        var security = new DirectorySecurity(); security.SetAccessRuleProtection(true, false);
        var sid = WindowsIdentity.GetCurrent().User ?? throw new IOException("Unknown Windows account.");
        security.AddAccessRule(new FileSystemAccessRule(sid, FileSystemRights.FullControl, InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit, PropagationFlags.None, AccessControlType.Allow));
        security.AddAccessRule(new FileSystemAccessRule(new SecurityIdentifier(WellKnownSidType.LocalSystemSid, null), FileSystemRights.FullControl, InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit, PropagationFlags.None, AccessControlType.Allow));
        new DirectoryInfo(path).Create(security);
    }
    internal static string Apply(LabProfile profile, string state)
    {
        profile.Validate(); FileSafety.DirectoryWithoutLinks(state); Directory.CreateDirectory(state);
        var key = Path.Combine(state, "pairing.dpapi"); var endpoint = Path.Combine(state, "teacher-endpoint.json");
        var lockFile = Path.Combine(state, ".lab-setup.lock");
        using var ownedLock = new FileStream(lockFile, FileMode.CreateNew, FileAccess.ReadWrite, FileShare.None, 1, FileOptions.DeleteOnClose);
        if (File.Exists(key) || File.Exists(endpoint))
        {
            FileSafety.Regular(key, 16384); FileSafety.Regular(endpoint, 4096);
            if (!profile.Matches(StudentTeacherConnectionSettings.Load(endpoint)!, StudentPairingKeyStore.OpenExisting(key)))
                throw new IOException("Existing settings belong to a different lab or endpoint. Nothing was replaced; use the student settings to review them.");
            return "unchanged";
        }
        var temp = Path.Combine(state, ".lab-setup-" + Guid.NewGuid().ToString("N")); MakePrivateDirectory(temp);
        var stagedKey = Path.Combine(temp, "pairing.dpapi"); var stagedEndpoint = Path.Combine(temp, "teacher-endpoint.json");
        bool movedEndpoint = false, movedKey = false;
        byte[]? expectedEndpoint = null;
        try
        {
            StudentPairingKeyStore.SaveNew(stagedKey, profile.PairingKey); profile.Endpoint.SaveNew(stagedEndpoint);
            expectedEndpoint = File.ReadAllBytes(stagedEndpoint);
            File.Move(stagedEndpoint, endpoint); movedEndpoint = true;
            File.Move(stagedKey, key); movedKey = true;
            return "configured";
        }
        catch
        {
            // Only roll back the exact endpoint written by this import; never erase an intervening writer.
            if (movedEndpoint && !movedKey && expectedEndpoint is not null && File.Exists(endpoint) &&
                (File.GetAttributes(endpoint) & FileAttributes.ReparsePoint) == 0 && File.ReadAllBytes(endpoint).SequenceEqual(expectedEndpoint)) File.Delete(endpoint);
            throw;
        }
        finally
        {
            if (File.Exists(stagedKey)) File.Delete(stagedKey);
            if (File.Exists(stagedEndpoint)) File.Delete(stagedEndpoint);
            Directory.Delete(temp, false);
        }
    }
}
