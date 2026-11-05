using System;
using System.IO;
using System.Security.AccessControl;
using System.Security.Principal;

internal static class AdministratorDirectoryAcl
{
    // The private provisioning directory must exist before credentials are requested.
    // Do not attempt to repair ACLs or create directories under an unsafe parent.
    internal static void Validate(string path)
    {
        if (!OperatingSystem.IsWindows()) throw new PlatformNotSupportedException();
        if (!Directory.Exists(path)) throw new InvalidDataException("Create a private administrator directory before provisioning.");
        var attributes = File.GetAttributes(path);
        if ((attributes & FileAttributes.ReparsePoint) != 0)
            throw new UnauthorizedAccessException("Provisioning directory must not be a reparse point.");

        var current = WindowsIdentity.GetCurrent().User ?? throw new UnauthorizedAccessException("Missing Windows user SID.");
        var system = new SecurityIdentifier(WellKnownSidType.LocalSystemSid, null);
        var administrators = new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid, null);
        var acl = new DirectoryInfo(path).GetAccessControl(AccessControlSections.Access | AccessControlSections.Owner);
        var owner = acl.GetOwner(typeof(SecurityIdentifier)) as SecurityIdentifier;
        if (owner is null || (!owner.Equals(current) && !owner.Equals(administrators)))
            throw new UnauthorizedAccessException("Unexpected provisioning directory owner.");

        const FileSystemRights write = FileSystemRights.Write | FileSystemRights.Modify |
            FileSystemRights.FullControl | FileSystemRights.Delete | FileSystemRights.DeleteSubdirectoriesAndFiles |
            FileSystemRights.ChangePermissions | FileSystemRights.TakeOwnership;
        foreach (FileSystemAccessRule rule in acl.GetAccessRules(true, true, typeof(SecurityIdentifier)))
        {
            if (rule.AccessControlType != AccessControlType.Allow || (rule.FileSystemRights & write) == 0) continue;
            if (rule.IdentityReference is not SecurityIdentifier sid ||
                (!sid.Equals(current) && !sid.Equals(system) && !sid.Equals(administrators)))
                throw new UnauthorizedAccessException("Provisioning directory has writable ACL for an unapproved principal.");
        }
    }
}
