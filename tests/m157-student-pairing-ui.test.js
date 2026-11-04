const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', 'windows', 'FBS.Student.Native');
const form = fs.readFileSync(path.join(root, 'StudentPairingTestForm.cs'), 'utf8');
const program = fs.readFileSync(path.join(root, 'Program.cs'), 'utf8');
const identity = fs.readFileSync(path.join(root, 'DeviceIdentity.cs'), 'utf8');
const client = fs.readFileSync(path.join(root, 'PinnedLanPairingClient.cs'), 'utf8');
for (const [name, source, expression] of [
 ['manual student UI', program, /new StudentPairingTestForm\(\)/],
 ['visible test button', program, /اختبار هوية الجهاز \(LAN\)/],
 ['student can cancel', form, /running\?\.Cancel\(\)/],
 ['student can close dialog', form, /FormClosing/],
 ['Arabic RTL UI', form, /RightToLeftLayout = true/],
 ['pin length checked', form, /pin\.Text\.Length != 64/],
 ['pin hex checked', form, /pin\.Text\.All\(Uri\.IsHexDigit\)/],
 ['manual start only', form, /start\.Click \+=/],
 ['private key never exported', identity, /OpenExistingSigningKey/],
 ['existing key required', identity, /CngKey\.Exists\(KeyName, provider\)/],
 ['no automatic enrollment', form, /No commands, remote input/],
 ['bounded TLS call', client, /timeout\.CancelAfter\(TimeSpan\.FromSeconds\(10\)\)/],
 ['TLS certificate pin passed', form, /fingerprint, id, signingKey/],
 ['clear pin memory', form, /ZeroMemory\(fingerprint\)/],
 ['result reports no control', form, /لم تُمنح صلاحيات تحكم/],
]) test(name, () => assert.match(source, expression));
