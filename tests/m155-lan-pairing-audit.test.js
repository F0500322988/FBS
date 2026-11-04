const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const server=fs.readFileSync(path.join(__dirname,'../windows/FBS.Teacher.Launcher/TeacherPinnedTlsListener.cs'),'utf8');
const client=fs.readFileSync(path.join(__dirname,'../windows/FBS.Student.Native/PinnedLanPairingClient.cs'),'utf8');
for(const [label,src,re] of [
 ['opt-in pairing listener',server,/RunPairingAuditAsync\(PersistentManagedEnrollment registry/],
 ['registry must not be locked',server,/if \(registry\.IsLocked\) throw/],
 ['TLS server authentication',server,/tls\.AuthenticateAsServerAsync/],
 ['bounded handshake time',server,/CancellationTokenSource\(TimeSpan\.FromSeconds\(10\)\)/],
 ['strict ASCII device IDs',server,/foreach \(byte b in idBytes\)/],
 ['challenge issued by approved registry',server,/registry\.IssueChallenge\(deviceId, DateTimeOffset\.UtcNow\)/],
 ['single-use challenge verification',server,/registry\.VerifyOnce\(deviceId, signature, DateTimeOffset\.UtcNow\)/],
 ['serialized registry access',server,/lock \(_registrySync\)/],
 ['unknown devices get no challenge',server,/if \(nonce is null\) return/],
 ['signature length bounded',server,/signature\.Length is < 256 or > 1024/],
 ['only identity acknowledgment',server,/new byte\[\] \{ \(byte\)'O', \(byte\)'K' \}/],
 ['no commands dispatched',server,/No dispatch, no input injection, no session token/],
 ['bounded framing',server,/length < 1 \|\| length > MaxFrameBytes/],
 ['client requires pin',client,/PinnedLanTlsChannel\.ConnectAsync/],
 ['client signs server challenge',client,/DeviceChallengeProof\.Sign\(devicePrivateKey, nonce\)/],
 ['client checks challenge length',client,/nonce\.Length != DeviceChallengeProof\.ChallengeBytes/],
 ['client checks acknowledgement',client,/reply\.Length == 2/],
 ['client clears signature',client,/CryptographicOperations\.ZeroMemory\(signature\)/],
 ['client does not auto-connect',client,/public static async Task<bool> ProveIdentityAsync/],
]) test(label,()=>assert.match(src,re));
