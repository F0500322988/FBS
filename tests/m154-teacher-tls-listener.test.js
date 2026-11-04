const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const file=fs.readFileSync(path.join(__dirname,'../windows/FBS.Teacher.Launcher/TeacherPinnedTlsListener.cs'),'utf8');
for(const [name,pattern] of [
 ['explicit bind address',/TeacherPinnedTlsListener\(IPAddress bindAddress/],
 ['reject wildcard IPv4',/IPAddress\.Any\.Equals/],
 ['reject wildcard IPv6',/IPAddress\.IPv6Any\.Equals/],
 ['private key required',/certificate\.HasPrivateKey/],
 ['TLS 1.2 and 1.3',/SslProtocols\.Tls12 \| SslProtocols\.Tls13/],
 ['cancellation supported',/AcceptTcpClientAsync\(cancellationToken\)/],
 ['connection capacity 40',/SemaphoreSlim _slots = new\(40, 40\)/],
 ['acquire before accept',/WaitAsync\(cancellationToken\)[\s\S]*AcceptTcpClientAsync/],
 ['10 second handshake timeout',/TimeSpan\.FromSeconds\(10\)/],
 ['no application dispatch',/Deliberately do not read, acknowledge or dispatch/],
 ['server authentication',/AuthenticateAsServerAsync/],
 ['no client certificate auth claim',/ClientCertificateRequired = false/],
 ['cleanup listener',/_listener\.Stop\(\)/],
 ['reject invalid port',/port < 1 \|\| port > 65535/],
 ['no silent startup',/RunAuditOnlyAsync/],
 ]) test(name,()=>assert.match(file,pattern));
