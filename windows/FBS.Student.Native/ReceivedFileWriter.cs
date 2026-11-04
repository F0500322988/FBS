using System;
using System.IO;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
namespace FBS.Student.Native;
public static class ReceivedFileWriter
{
    public static async Task WriteAsync(byte[] data, int expectedSize, string hash, string destination, CancellationToken cancellation = default)
    {
        if (data.Length == 0 || data.Length > 5 * 1024 * 1024 || data.Length != expectedSize || !Convert.ToHexString(SHA256.HashData(data)).Equals(hash, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("File integrity check failed");
        if (!Path.IsPathFullyQualified(destination)) throw new InvalidDataException("An explicit absolute save destination is required");
        cancellation.ThrowIfCancellationRequested();
        var temporary = Path.Combine(Path.GetDirectoryName(destination)!, ".fbs-" + Guid.NewGuid().ToString("N") + ".tmp"); bool owned = false;
        try
        {
            await using (var stream = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None)) { owned = true; await stream.WriteAsync(data, cancellation); }
            cancellation.ThrowIfCancellationRequested(); File.Move(temporary, destination, overwrite: true); owned = false;
        }
        finally { if (owned) File.Delete(temporary); }
    }
}
