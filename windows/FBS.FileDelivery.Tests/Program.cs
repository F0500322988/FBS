using FBS.Student.Native;
using System.Security.Cryptography;
var root = Path.Combine(Path.GetTempPath(), "fbs-file-save-tests-" + Guid.NewGuid().ToString("N")); Directory.CreateDirectory(root);
var data = "FBS worksheet — نشاط"u8.ToArray(); var hash = Convert.ToHexString(SHA256.HashData(data)); var destination = Path.Combine(root, "lesson.txt"); int passed = 0;
void Check(bool value) { if (!value) throw new Exception("File save invariant failed"); passed++; }
async Task Reject(byte[] bytes, int length, string digest, string path, CancellationToken token = default) { try { await ReceivedFileWriter.WriteAsync(bytes, length, digest, path, token); throw new Exception("Invalid save accepted"); } catch (Exception ex) when (ex is InvalidDataException or OperationCanceledException) { passed++; } }
try {
 await File.WriteAllTextAsync(destination,"original");
 await Reject(data,data.Length,"bad",destination); Check(await File.ReadAllTextAsync(destination)=="original");
 await Reject(data,data.Length+1,hash,destination); await Reject([],0,hash,destination); await Reject(data,data.Length,hash,"relative.txt");
 await Reject(data,data.Length,hash,destination,new CancellationToken(true)); Check(await File.ReadAllTextAsync(destination)=="original");
 await ReceivedFileWriter.WriteAsync(data,data.Length,hash,destination); Check((await File.ReadAllBytesAsync(destination)).SequenceEqual(data)); Check(Directory.GetFiles(root).Length==1);
 Console.WriteLine($"File delivery save checks: {passed} passed. No GUI or file execution tested.");
} finally { Directory.Delete(root,true); }
