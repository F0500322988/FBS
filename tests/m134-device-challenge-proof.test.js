const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const proof = fs.readFileSync(path.join(root, 'windows/FBS.Student.Native/DeviceChallengeProof.cs'), 'utf8');
const smoke = fs.readFileSync(path.join(root, 'windows/FBS.NativeSafety.Smoke/Program.cs'), 'utf8');
const project = fs.readFileSync(path.join(root, 'windows/FBS.NativeSafety.Smoke/FBS.NativeSafety.Smoke.csproj'), 'utf8');
for (const [label, pattern] of [
  ['cryptographic random challenge', /RandomNumberGenerator\.GetBytes\(ChallengeBytes\)/],
  ['challenge length', /ChallengeBytes = 32/],
  ['RSA-PSS signature', /SignData\(challenge, HashAlgorithmName\.SHA256, RSASignaturePadding\.Pss\)/],
  ['RSA-PSS verification', /VerifyData\(challenge, signature, HashAlgorithmName\.SHA256, RSASignaturePadding\.Pss\)/],
  ['public key imported', /ImportSubjectPublicKeyInfo/],
  ['invalid challenge denied', /!ValidChallenge\(challenge\)/],
  ['malformed key denied', /catch \(CryptographicException\) \{ return false; \}/],
]) test(`M134 ${label}`, () => assert.match(proof, pattern));
for (const [label, pattern] of [
  ['smoke includes proof', /TestChallengeProof\(\)/],
  ['tamper rejected', /modified challenge rejected/],
  ['wrong key rejected', /wrong device key rejected/],
  ['replay rejected', /replayed signature on fresh challenge rejected/],
  ['smoke project compiles proof', /DeviceChallengeProof\.cs/],
]) test(`M134 ${label}`, () => assert.match(label.includes('project') ? project : smoke, pattern));
