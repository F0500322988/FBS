using System;
using System.IO;
using System.Security.Cryptography;

namespace FBS.Student.Native;

/// <summary>
/// M146: explicit, fail-closed startup for a previously provisioned administrator.
/// Never provisions credentials or exposes a network endpoint. Invoke only from a
/// trusted, locally authenticated administrator host, not from student polling.
/// </summary>
public static class WindowsEnrollmentBootstrap
{
    public static ManagedEnrollmentCommandService OpenExisting(string administratorDirectory)
    {
        if (!OperatingSystem.IsWindows())
            throw new PlatformNotSupportedException("Windows administrator bootstrap required");
        if (string.IsNullOrWhiteSpace(administratorDirectory))
            throw new ArgumentException("Administrator directory required", nameof(administratorDirectory));
        var root = Path.GetFullPath(administratorDirectory);
        if (!Directory.Exists(root))
            throw new DirectoryNotFoundException("Administrator configuration has not been provisioned");
        var vaultPath = Path.Combine(root, "admin-credentials.dpapi");
        var registryPath = Path.Combine(root, "managed-devices.enc");
        var lockoutPath = Path.Combine(root, "admin-lockout.enc");
        if (!File.Exists(vaultPath) || !File.Exists(registryPath) || !File.Exists(lockoutPath))
            throw new InvalidDataException("Existing administrator configuration is incomplete");
        var (salt, verifier, registryKey, lockoutKey) = WindowsAdminCredentialVault.OpenExisting(vaultPath);
        try
        {
            var registry = new PersistentManagedEnrollment(registryPath, registryKey);
            if (registry.IsLocked)
                throw new InvalidDataException("Managed device registry could not be verified");
            var admin = AuthenticatedEnrollmentService.OpenExisting(
                registry, salt, verifier, lockoutPath, lockoutKey);
            if (admin.IsLockedDown)
                throw new InvalidDataException("Administrator lockout state could not be verified");
            return new ManagedEnrollmentCommandService(admin);
        }
        finally
        {
            CryptographicOperations.ZeroMemory(salt);
            CryptographicOperations.ZeroMemory(verifier);
            CryptographicOperations.ZeroMemory(registryKey);
            CryptographicOperations.ZeroMemory(lockoutKey);
        }
    }
}
