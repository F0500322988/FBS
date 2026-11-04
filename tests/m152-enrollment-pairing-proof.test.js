const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../windows/FBS.Student.Native/EnrollmentPairingProof.cs'), 'utf8');
const project = fs.readFileSync(path.join(__dirname, '../windows/FBS.Student.Native/FBS.Student.Native.csproj'), 'utf8');
const checks = [
 ['pairing proof is a dedicated source file', /public static class EnrollmentPairingProof/],
 ['domain separated transcript', /FBS-Classroom\/enrollment-pairing\/v1/],
 ['32-byte nonce', /NonceLength = 32/],
 ['cryptographically random nonce', /RandomNumberGenerator.GetBytes\(NonceLength\)/],
 ['PSS signing', /SignData\(message, HashAlgorithmName.SHA256, RSASignaturePadding.Pss\)/],
 ['PSS verification', /VerifyData\(message, signature, HashAlgorithmName.SHA256, RSASignaturePadding.Pss\)/],
 ['approved key input required', /byte\[\]\? approvedSpki/],
 ['RSA key size minimum', /rsa.KeySize >= 2048/],
 ['rejects trailing SPKI bytes', /consumed == approvedSpki.Length/],
 ['bounds signature size', /signature.Length > 1024/],
 ['bounds public key size', /approvedSpki.Length > 2048/],
 ['length-prefixes ID', /WriteUInt16BigEndian/],
 ['zeroes signed transcript', /ZeroMemory\(message\)/],
 ['rejects malformed identifiers', /private static bool ValidId/],
 ['no network listener or authorization endpoint', /No HTTP listener, key distribution or automatic trust/],
];
for (const [name, pattern] of checks) test('M152: '+name, () => assert.match(source, pattern));
test('M152: native project includes default compile items', () => assert.match(project, /Microsoft.NET.Sdk/));
