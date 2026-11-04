using System;
using System.IO;
using System.Security.Cryptography;
using FBS.Student.Native;

// M129: Windows-only runtime smoke test. It NEVER enables native input or sends OS input.
// Run on a disposable test student workstation, not an active class.
internal static class Program
{
    [STAThread]
    private static int Main()
    {
        if (!OperatingSystem.IsWindows())
        {
            Console.Error.WriteLine("FAIL: This smoke test requires Windows.");
            return 2;
        }
        try
        {
            var adapter = new WindowsInputAdapter();
            Check(NativeInputSafetyProbe.VerifyDisabled(adapter), "startup native-input probe");
            adapter.EnableForVerifiedSession(true); // must remain disabled in this release
            Check(!adapter.Enabled, "adapter cannot be enabled");
            Check(!adapter.MovePointer(0, 0), "pointer rejected");
            Check(!adapter.TapLetter('A'), "keyboard rejected");

            var guard = new StopRaceGuard();
            var now = DateTimeOffset.UtcNow;
            var expiry = now.AddMinutes(1);
            var oldGeneration = guard.Generation;
            Check(guard.MayApply("session-test", oldGeneration, expiry, now), "fresh preview allowed");
            guard.Stop("session-test");
            Check(guard.WasStopped("session-test"), "local stop recorded");
            Check(!guard.MayApply("session-test", oldGeneration, expiry, now), "stopped session rejected");
            Check(!PollResponseGuard.MayApply(oldGeneration, guard.Generation,
                "session-test", "session-test", now, expiry), "late response rejected");
            Check(!PollResponseGuard.MayApply(guard.Generation, guard.Generation,
                "session-test", "session-test", now, expiry), "stopped response rejected");
            Check(!PollResponseGuard.MayApply(guard.Generation, guard.Generation,
                "session-test", "other-test", now, now.AddSeconds(-1)), "expired response rejected");
            // M130 regression: stopping B must never erase the tombstone for A.
            var generationBeforeSecondStop = guard.Generation;
            guard.Stop("session-second");
            Check(guard.WasStopped("session-test"), "first stop persists after second stop");
            Check(guard.WasStopped("session-second"), "second stop recorded");
            Check(!guard.MayApply("session-test", guard.Generation, expiry, now), "first stopped session cannot revive");
            Check(!guard.MayApply("session-second", guard.Generation, expiry, now), "second stopped session cannot revive");
            Check(!guard.MayApply("session-third", generationBeforeSecondStop, expiry, now), "in-flight poll invalidated by second stop");
            Check(guard.MayApply("session-third", guard.Generation, expiry, now), "fresh distinct session remains eligible");
            guard.Stop("session-test");
            Check(!guard.MayApply("session-test", guard.Generation, expiry, now), "repeat stop cannot revive session");

            TestPersistentLedgerRestart();
            TestChallengeProof();
            TestManagedRegistry();
            TestEncryptedRegistryPersistence();
            TestAuthenticatedEnrollment();
            TestM139DurableLockout();
            TestM140MissingLockoutState();
            TestM141EnrollmentBoundary();
            Console.WriteLine("PASS: M132 Windows native safety and persisted-stop restart smoke tests.");
            Console.WriteLine("NOTE: This does not test actual mouse/keyboard injection or remote-control safety.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("FAIL: " + ex.GetType().Name + ": " + ex.Message);
            return 1;
        }
    }

    private static void TestChallengeProof()
    {
        using var enrolledKey = RSA.Create(3072);
        using var otherKey = RSA.Create(3072);
        var publicKey = enrolledKey.ExportSubjectPublicKeyInfo();
        var challenge = DeviceChallengeProof.CreateChallenge();
        var signature = DeviceChallengeProof.Sign(enrolledKey, challenge);
        Check(DeviceChallengeProof.Verify(publicKey, challenge, signature), "valid device challenge signature");
        var tampered = (byte[])challenge.Clone();
        tampered[0] ^= 1;
        Check(!DeviceChallengeProof.Verify(publicKey, tampered, signature), "modified challenge rejected");
        Check(!DeviceChallengeProof.Verify(otherKey.ExportSubjectPublicKeyInfo(), challenge, signature), "wrong device key rejected");
        Check(!DeviceChallengeProof.Verify(publicKey, new byte[31], signature), "short challenge rejected");
        Check(!DeviceChallengeProof.Verify(publicKey, challenge, Array.Empty<byte>()), "empty signature rejected");
        Check(!DeviceChallengeProof.Verify(new byte[] { 1, 2, 3 }, challenge, signature), "malformed public key rejected");
        Check(!DeviceChallengeProof.Verify(publicKey, DeviceChallengeProof.CreateChallenge(), signature), "replayed signature on fresh challenge rejected");
    }

    private static void TestManagedRegistry()
    {
        var registry = new ManagedDeviceRegistry();
        using var first = RSA.Create(3072);
        using var second = RSA.Create(3072);
        var key = first.ExportSubjectPublicKeyInfo();
        var now = DateTimeOffset.UtcNow;
        Check(!registry.Provision("lab-01", key, false), "unauthenticated enrollment denied");
        Check(registry.Provision("lab-01", key, true), "admin-provisioned device accepted");
        Check(!registry.Provision("lab-01", second.ExportSubjectPublicKeyInfo(), true), "silent key replacement denied");
        Check(registry.IssueChallenge("unknown", now) is null, "unenrolled device denied challenge");
        var nonce = registry.IssueChallenge("lab-01", now)!;
        var sig = DeviceChallengeProof.Sign(first, nonce);
        Check(registry.VerifyOnce("lab-01", sig, now), "enrolled key proof accepted once");
        Check(!registry.VerifyOnce("lab-01", sig, now), "replay denied");
        var nonce2 = registry.IssueChallenge("lab-01", now)!;
        Check(!registry.VerifyOnce("lab-01", DeviceChallengeProof.Sign(second, nonce2), now), "wrong key denied");
        Check(!registry.VerifyOnce("lab-01", DeviceChallengeProof.Sign(first, nonce2), now), "failed proof consumes challenge");
        var nonce3 = registry.IssueChallenge("lab-01", now)!;
        Check(!registry.VerifyOnce("lab-01", DeviceChallengeProof.Sign(first, nonce3), now.AddSeconds(31)), "expired challenge denied");
        Check(!registry.Revoke("lab-01", false), "unauthenticated revocation denied");
        Check(registry.Revoke("lab-01", true), "admin revocation accepted");
        Check(registry.IssueChallenge("lab-01", now) is null, "revoked device denied");
        Check(!registry.Provision("lab-01", key, true), "revoked identifier cannot silently re-enroll");
    }

    private static void TestEncryptedRegistryPersistence()
    {
        var dir = Path.Combine(Path.GetTempPath(), "fbs-m136-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        try
        {
            var path = Path.Combine(dir, "registry.dat");
            using var device = RSA.Create(2048);
            var registry = new ManagedDeviceRegistry();
            Check(registry.Provision("managed-01", device.ExportSubjectPublicKeyInfo(), true), "M136 device provisioned");
            var key = RandomNumberGenerator.GetBytes(32);
            EncryptedDeviceRegistryStore.Save(path, registry, key);
            var loaded = EncryptedDeviceRegistryStore.Load(path, key);
            var now = DateTimeOffset.UtcNow;
            var nonce = loaded.IssueChallenge("managed-01", now)!;
            Check(loaded.VerifyOnce("managed-01", DeviceChallengeProof.Sign(device, nonce), now), "M136 enrollment survives restart");
            Check(loaded.Revoke("managed-01", true), "M136 revoke");
            EncryptedDeviceRegistryStore.Save(path, loaded, key);
            var afterRevoke = EncryptedDeviceRegistryStore.Load(path, key);
            Check(afterRevoke.IssueChallenge("managed-01", now) is null, "M136 revocation survives restart");
            var corrupted = File.ReadAllBytes(path);
            corrupted[^1] ^= 1;
            File.WriteAllBytes(path, corrupted);
            var rejected = false;
            try { EncryptedDeviceRegistryStore.Load(path, key); }
            catch (CryptographicException) { rejected = true; }
            Check(rejected, "M136 tampered ciphertext rejected");
            EncryptedDeviceRegistryStore.Save(path, afterRevoke, key);
            rejected = false;
            try { EncryptedDeviceRegistryStore.Load(path, RandomNumberGenerator.GetBytes(32)); }
            catch (CryptographicException) { rejected = true; }
            Check(rejected, "M136 incorrect encryption key rejected");
        }
        finally { Directory.Delete(dir, recursive: true); }
    }

    private static void TestAuthenticatedEnrollment()
    {
        var dir = Path.Combine(Path.GetTempPath(), "fbs-m138-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        try
        {
            var key = RandomNumberGenerator.GetBytes(32);
            var store = PersistentManagedEnrollment.InitializeNew(Path.Combine(dir, "registry.dat"), key, true);
            var (salt, verifier) = AuthenticatedEnrollmentService.CreateVerifier("M138-Strong-Test-Password!");
            var auth = new AuthenticatedEnrollmentService(store, salt, verifier);
            using var rsa = RSA.Create(2048);
            var spki = rsa.ExportSubjectPublicKeyInfo();
            var now = DateTimeOffset.UtcNow;
            Check(!auth.Provision("device-01", spki, "incorrect", now), "M138 incorrect admin credential denied");
            Check(auth.Provision("device-01", spki, "M138-Strong-Test-Password!", now), "M138 verified administrator provisions device");
            Check(!auth.Revoke("device-01", "incorrect", now), "M138 incorrect revocation credential denied");
            Check(auth.Revoke("device-01", "M138-Strong-Test-Password!", now), "M138 verified administrator revokes device");
            var reopened = new PersistentManagedEnrollment(Path.Combine(dir, "registry.dat"), key);
            Check(reopened.IssueChallenge("device-01", now) is null, "M138 revocation survives reload");
            for (var i = 0; i < 5; i++)
                Check(!auth.Provision("device-02", spki, "incorrect", now), "M138 failed credential attempt denied");
            Check(!auth.Provision("device-02", spki, "M138-Strong-Test-Password!", now.AddSeconds(1)), "M138 lockout blocks valid credential");
            Check(auth.Provision("device-02", spki, "M138-Strong-Test-Password!", now.AddMinutes(6)), "M138 valid credential accepted after lockout");
        }
        finally { Directory.Delete(dir, recursive: true); }
    }

    private static void TestM139DurableLockout()
    {
        var dir = Path.Combine(Path.GetTempPath(), "fbs-m139-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        try
        {
            var registryKey = RandomNumberGenerator.GetBytes(32);
            var stateKey = RandomNumberGenerator.GetBytes(32);
            var registryPath = Path.Combine(dir, "registry.bin");
            var statePath = Path.Combine(dir, "attempts.bin");
            var registry = PersistentManagedEnrollment.InitializeNew(registryPath, registryKey, true);
            var (salt, verifier) = AuthenticatedEnrollmentService.CreateVerifier("M139-Strong-Admin-Password!");
            var first = new AuthenticatedEnrollmentService(registry, salt, verifier, statePath, stateKey);
            using var rsa = RSA.Create(2048);
            var key = rsa.ExportSubjectPublicKeyInfo();
            var now = DateTimeOffset.UtcNow;
            Check(!first.IsLockedDown, "M139 initial state persisted");
            for (var i = 0; i < 5; i++)
                Check(!first.Provision("device-m139", key, "wrong", now), "M139 wrong password denied");
            var reopened = new AuthenticatedEnrollmentService(registry, salt, verifier, statePath, stateKey);
            Check(!reopened.Provision("device-m139", key, "M139-Strong-Admin-Password!", now.AddSeconds(1)), "M139 lockout survives restart");
            Check(reopened.Provision("device-m139", key, "M139-Strong-Admin-Password!", now.AddMinutes(6)), "M139 unlock after timeout");
            File.WriteAllBytes(statePath, new byte[] { 1, 2, 3 });
            var tampered = new AuthenticatedEnrollmentService(registry, salt, verifier, statePath, stateKey);
            Check(tampered.IsLockedDown && !tampered.Revoke("device-m139", "M139-Strong-Admin-Password!", now.AddMinutes(7)), "M139 corrupt state fails closed");
        }
        finally { Directory.Delete(dir, recursive: true); }
    }

    private static void TestM140MissingLockoutState()
    {
        var dir = Path.Combine(Path.GetTempPath(), "fbs-m140-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        try
        {
            var registryKey = RandomNumberGenerator.GetBytes(32);
            var stateKey = RandomNumberGenerator.GetBytes(32);
            var registry = PersistentManagedEnrollment.InitializeNew(Path.Combine(dir, "registry.bin"), registryKey, true);
            var (salt, verifier) = AuthenticatedEnrollmentService.CreateVerifier("M140-Strong-Admin-Password!");
            var path = Path.Combine(dir, "attempts.bin");
            using var rsa = RSA.Create(2048);
            var key = rsa.ExportSubjectPublicKeyInfo();
            var now = DateTimeOffset.UtcNow;
            var initial = new AuthenticatedEnrollmentService(registry, salt, verifier, path, stateKey);
            Check(!initial.IsLockedDown, "M140 explicit initial provisioning works");
            Check(!initial.Provision("m140-device", key, "wrong", now), "M140 failed attempt stored");
            var reopened = AuthenticatedEnrollmentService.OpenExisting(registry, salt, verifier, path, stateKey);
            Check(!reopened.IsLockedDown, "M140 existing lockout state loads");
            File.Delete(path);
            var missing = AuthenticatedEnrollmentService.OpenExisting(registry, salt, verifier, path, stateKey);
            Check(missing.IsLockedDown, "M140 missing lockout state fails closed");
            Check(!missing.Provision("m140-device", key, "M140-Strong-Admin-Password!", now), "M140 missing state denies enrollment");
            File.WriteAllBytes(path, new byte[] { 1, 2, 3 });
            var corrupt = AuthenticatedEnrollmentService.OpenExisting(registry, salt, verifier, path, stateKey);
            Check(corrupt.IsLockedDown, "M140 corrupt lockout state fails closed");
        }
        finally { Directory.Delete(dir, recursive: true); }
    }

    private static void TestPersistentLedgerRestart()
    {
        // Isolated temporary file: never touches the student's real stop ledger.
        var directory = Path.Combine(Path.GetTempPath(), "fbs-m132-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        try
        {
            var path = Path.Combine(directory, "stopped.json");
            var first = new PersistentStopLedger(path);
            Check(!first.LockedDown, "new isolated ledger starts unlocked");
            Check(first.Stop("session-before-restart"), "first stop durably recorded");
            Check(first.Stop("session-second-stop"), "second stop durably recorded");
            // Constructing a new instance simulates a new application process.
            var afterRestart = new PersistentStopLedger(path);
            Check(!afterRestart.LockedDown, "valid ledger loads after process restart");
            Check(afterRestart.WasStopped("session-before-restart"), "first stopped session survives restart");
            Check(afterRestart.WasStopped("session-second-stop"), "second stopped session survives restart");
            Check(!afterRestart.WasStopped("new-authorized-session"), "new distinct session not falsely stopped");
            Check(afterRestart.Stop("session-after-restart"), "new stop saved after restart");
            var third = new PersistentStopLedger(path);
            Check(third.WasStopped("session-after-restart"), "new stop survives second restart");
            File.WriteAllText(path, "{broken-json");
            var corrupt = new PersistentStopLedger(path);
            Check(corrupt.LockedDown, "corrupt ledger locks down");
            Check(corrupt.WasStopped("new-authorized-session"), "corrupt ledger denies all sessions");
            Check(!corrupt.Stop("another-session"), "corrupt ledger cannot silently overwrite history");
        }
        finally
        {
            try { Directory.Delete(directory, recursive: true); }
            catch (IOException) { /* Cleanup is best effort; test data is isolated. */ }
            catch (UnauthorizedAccessException) { /* Cleanup is best effort. */ }
        }
    }

    private static void TestM141EnrollmentBoundary()
    {
        var directory = Path.Combine(Path.GetTempPath(), "fbs-m141-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        try
        {
            var registryPath = Path.Combine(directory, "registry.enc");
            var lockoutPath = Path.Combine(directory, "admin-lockout.enc");
            var registry = PersistentManagedEnrollment.InitializeNew(registryPath,
                RandomNumberGenerator.GetBytes(32), administratorAuthenticated: true);
            const string password = "M141-Strong-Administrator-Password!";
            var (salt, verifier) = AuthenticatedEnrollmentService.CreateVerifier(password);
            var admin = new AuthenticatedEnrollmentService(registry, salt, verifier,
                lockoutPath, RandomNumberGenerator.GetBytes(32));
            var boundary = new ManagedEnrollmentCommandService(admin);
            using var rsa = RSA.Create(3072);
            var key = rsa.ExportSubjectPublicKeyInfo();
            var now = DateTimeOffset.UtcNow;
            Check(!boundary.Register("bad/device", key, password, now), "M141 malformed device ID rejected");
            Check(!boundary.Register("lab-01", new byte[] { 1, 2, 3 }, password, now), "M141 malformed public key rejected");
            Check(!boundary.Register("lab-01", key, "wrong-password", now), "M141 invalid administrator denied");
            Check(boundary.Register("lab-01", key, password, now), "M141 authenticated device registration");
            Check(!boundary.Remove("lab-01", "wrong-password", now), "M141 unauthenticated revocation denied");
            Check(boundary.Remove("lab-01", password, now), "M141 authenticated device revocation");
            Check(!boundary.Register("lab-01", key, password, now), "M141 revoked ID cannot silently re-enroll");
        }
        finally
        {
            try { Directory.Delete(directory, recursive: true); }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
        }
    }

    private static void Check(bool condition, string label)
    {
        if (!condition) throw new InvalidOperationException(label);
        Console.WriteLine("PASS: " + label);
    }
}
