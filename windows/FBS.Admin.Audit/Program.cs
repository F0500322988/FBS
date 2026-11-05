using System;
using System.IO;
using FBS.Student.Native;

// M149: read-only local verification of previously provisioned administrator state.
// Never creates, repairs, or deletes credential files. Does not print secret material.
if (!OperatingSystem.IsWindows() || args.Length != 1 || string.IsNullOrWhiteSpace(args[0]))
{
    Console.Error.WriteLine("Usage (Windows only): FBS.Admin.Audit <existing-private-directory>");
    return 2;
}
try
{
    string root = Path.GetFullPath(args[0]);
    AdministratorDirectoryAcl.Validate(root);
    foreach (string filename in new[] { "admin-credentials.dpapi", "managed-devices.enc", "admin-lockout.enc" })
    {
        string file = Path.Combine(root, filename);
        if (!File.Exists(file)) throw new InvalidDataException("Missing required administrator state file.");
        if ((File.GetAttributes(file) & FileAttributes.ReparsePoint) != 0)
            throw new UnauthorizedAccessException("Administrator state file cannot be a reparse point.");
        if (new FileInfo(file).Length == 0) throw new InvalidDataException("Empty administrator state file.");
    }
    _ = WindowsEnrollmentBootstrap.OpenExisting(root);
    Console.WriteLine("PASS: existing administrator ACL and encrypted enrollment state verified (read-only).");
    return 0;
}
catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or InvalidDataException or System.Security.Cryptography.CryptographicException or ArgumentException)
{
    // Avoid disclosing paths, usernames, or details of protected state.
    Console.Error.WriteLine("FAIL: existing administrator state or permissions could not be verified. No changes made.");
    return 1;
}
