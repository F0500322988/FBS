const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '../windows/FBS.Student.Native/PinnedLanTlsChannel.cs');
const source = fs.readFileSync(file, 'utf8');
const checks = [
 ['outbound TLS channel class', /class PinnedLanTlsChannel : IAsyncDisposable/],
 ['outbound TCP connect only', /tcp.ConnectAsync\(host, port, timeout.Token\)/],
 ['requires a 32 byte certificate pin', /expectedCertificateSha256.Length != 32/],
 ['certificate fingerprint SHA256', /SHA256.HashData\(cert.RawData\)/],
 ['constant-time certificate pin comparison', /CryptographicOperations.FixedTimeEquals\(actual, pin\)/],
 ['rejects TLS name mismatch', /RemoteCertificateNameMismatch/],
 ['rejects missing certificate', /RemoteCertificateNotAvailable/],
 ['sets target hostname', /TargetHost = host/],
 ['TLS 1.2 and TLS 1.3 only', /SslProtocols.Tls12 \| SslProtocols.Tls13/],
 ['revocation check configured', /CertificateRevocationCheckMode = X509RevocationMode.Online/],
 ['connection timeout', /CancelAfter\(TimeSpan.FromSeconds\(10\)\)/],
 ['length-limited frames', /MaxFrameBytes = 64 \* 1024/],
 ['big endian frame length', /WriteInt32BigEndian/],
 ['rejects malformed frame sizes', /size < 1 \|\| size > MaxFrameBytes/],
 ['reads exactly frame payload', /ReadExactlyAsync\(payload, cancellationToken\)/],
 ['serializes writes', /_writeLock.WaitAsync/],
 ['serializes reads', /_readLock.WaitAsync/],
 ['does not grant command authorization', /Not wired into the student runtime by default/],
];
for (const [name, pattern] of checks) test('M153: '+name, () => assert.match(source, pattern));
test('M153: no server listener or input injection', () => {
  assert.doesNotMatch(source, /TcpListener|HttpListener|SendInput\(|mouse_event\(/);
});
