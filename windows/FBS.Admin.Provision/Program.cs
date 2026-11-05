using System;
using System.IO;
using System.Security.Cryptography;
using FBS.Student.Native;

// M147: dedicated interactive administrator-only *local* first-run provisioning.
// No HTTP endpoint, no password CLI arguments, no unattended default credentials.
if (!OperatingSystem.IsWindows() || Console.IsInputRedirected)
{
    Console.Error.WriteLine("Run interactively on Windows under the dedicated administrator account.");
    return 2;
}
if (args.Length != 1 || string.IsNullOrWhiteSpace(args[0]))
{
    Console.Error.WriteLine("Usage: FBS.Admin.Provision <administrator-owned-empty-directory>");
    return 2;
}
string root = Path.GetFullPath(args[0]);
string vault = Path.Combine(root, "admin-credentials.dpapi");
string registry = Path.Combine(root, "managed-devices.enc");
string lockout = Path.Combine(root, "admin-lockout.enc");
if (Directory.Exists(root) && (Directory.EnumerateFileSystemEntries(root).Any()))
{
    Console.Error.WriteLine("Refusing to initialize a nonempty directory or overwrite existing state.");
    return 3;
}
try
{
    AdministratorDirectoryAcl.Validate(root);
}
catch (Exception ex) when (ex is UnauthorizedAccessException or InvalidDataException or IOException)
{
    Console.Error.WriteLine("FAIL: administrator directory ACL preflight rejected the directory.");
    Console.Error.WriteLine(ex.Message);
    return 3;
}
Console.WriteLine("Provisioning is local-only. Use a dedicated Windows administrator account.");
Console.WriteLine("Private directory ownership and writable ACL preflight passed.");
Console.Write("Type PROVISION to confirm first-time setup: ");
if (Console.ReadLine() != "PROVISION") return 3;
static string ReadSecret(string label)
{
    Console.Write(label);
    var chars = new System.Text.StringBuilder();
    while (true)
    {
        var key = Console.ReadKey(intercept: true);
        if (key.Key == ConsoleKey.Enter) { Console.WriteLine(); break; }
        if (key.Key == ConsoleKey.Backspace) { if (chars.Length > 0) chars.Length--; continue; }
        if (!char.IsControl(key.KeyChar) && chars.Length < 256) chars.Append(key.KeyChar);
    }
    return chars.ToString();
}
string password = ReadSecret("New administrator password (14+ characters): ");
string confirm = ReadSecret("Confirm password: ");
if (password.Length < 14 || !string.Equals(password, confirm, StringComparison.Ordinal))
{
    Console.Error.WriteLine("Password requirements or confirmation failed.");
    return 3;
}
byte[]? salt = null, verifier = null, registryKey = null, lockoutKey = null;
try
{
    AdministratorDirectoryAcl.Validate(root); // Recheck immediately before writing secrets.
    WindowsAdminCredentialVault.ProvisionNew(vault, password);
    (salt, verifier, registryKey, lockoutKey) = WindowsAdminCredentialVault.OpenExisting(vault);
    var enrollment = PersistentManagedEnrollment.InitializeNew(registry, registryKey, administratorAuthenticated: true);
    var auth = new AuthenticatedEnrollmentService(enrollment, salt, verifier, lockout, lockoutKey);
    if (auth.IsLockedDown) throw new InvalidDataException("Could not initialize lockout state");
    // Verify the complete existing-state startup contract before reporting success.
    _ = WindowsEnrollmentBootstrap.OpenExisting(root);
    Console.WriteLine("PASS: administrator enrollment initialized. Store this directory securely.");
    return 0;
}
catch (Exception ex)
{
    // Partial provisioning is deliberately left intact to fail closed; never auto-reset.
    Console.Error.WriteLine("FAIL: provisioning incomplete. Do not delete or overwrite partial state automatically.");
    Console.Error.WriteLine(ex.GetType().Name);
    return 1;
}
finally
{
    if (salt is not null) CryptographicOperations.ZeroMemory(salt);
    if (verifier is not null) CryptographicOperations.ZeroMemory(verifier);
    if (registryKey is not null) CryptographicOperations.ZeroMemory(registryKey);
    if (lockoutKey is not null) CryptographicOperations.ZeroMemory(lockoutKey);
}
