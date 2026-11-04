# FBS Classroom M4 — Live roster

This milestone integrates teacher LAN heartbeats into the existing Arabic dashboard. It is NOT an installer, encrypted remote-control tool, or production-ready classroom management product.

## Teacher (Windows PowerShell, from project directory)

Install Node.js, then run:

```powershell
$env:FBS_PAIRING_KEY = Read-Host 'Enter the same lab pairing key used by students'
node server.js
```

Open http://127.0.0.1:4177 on the teacher PC. Student agents using the M3 installation and the same pairing key will appear with their observed IP addresses and connection status. Agents refresh every 5 seconds; a device is considered offline after 20 seconds. The dashboard refreshes every 10 seconds. The teacher PC must permit inbound TCP 4180 and students must permit inbound UDP 4181; UDP broadcast must be allowed on the LAN. Windows Firewall rules should be scoped to the Private profile and lab subnet.

## Demo mode

```powershell
$env:FBS_DEMO='1'
node server.js
```

Demo mode displays simulated devices. **Remove FBS_DEMO** before live use.

## Security limitations

The M3 student agent uses an HTTP heartbeat with a shared key header. This is NOT encrypted and does not provide per-device authentication; only test on a trusted isolated lab network. Do not reuse personal passwords as the pairing key. Device IDs can collide. A secure TLS enrollment protocol, per-device identities, authorization, screen-sharing permissions, signed binaries, and actual installer packaging are future work. The student startup mechanism is per-user and starts on sign-in, not as a Windows system service.

## Tests

```powershell
node --test tests/*.test.js
```
