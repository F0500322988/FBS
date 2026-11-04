# FBS Classroom M11 — Local Windows device identity

This milestone adds a **persistent non-exportable Windows CNG RSA identity** to the native Windows student UI.
The first run creates a key under the **current Windows user**; subsequent runs under the same user reuse it.
The UI shows a 24-hex-character identifier derived from SHA-256 of the public key.

## Build
On Windows 11 with .NET 8 SDK installed:

```powershell
cd windows\FBS.Student.Native
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true
```

## Important limitations
- This **does not enroll the device with the teacher** or authenticate it on the LAN yet.
- The device identifier is stable per Windows user profile, not per physical machine. Different Windows accounts get different identities.
- No input injection or remote-control listener is included.
- The local stop button is still a future-control UI placeholder.
- The Windows executable was **not compiled or tested on Windows** in this environment.
- Do not delete the Windows CNG key unless you intend to reset device identity.

## Next
Implement challenge-response enrollment with teacher approval, public-key storage, device revocation, and teacher audit logs. Only after those are tested should an interactive-session input-control component be built.
