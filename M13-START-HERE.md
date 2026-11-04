# FBS Classroom M13 — Teacher enrollment UI

## Added
- New Arabic sidebar page **اعتماد الأجهزة**.
- Shows discovered students and their online / approval state.
- Approve or revoke directly from the teacher console with a confirmation prompt.
- Requires teacher session; uses the existing M12 enrollment endpoints.
- Revocation retains the M12 behavior of removing active screen frames and pending control requests.

## Run
Use the same M12 teacher TLS certificate, pairing key, and teacher password.
Run `node server.js`, then open `http://127.0.0.1:4177` locally.
Choose **اعتماد الأجهزة** in the sidebar.

## Important limitation
**This is an administrative approval UI, not a cryptographic device enrollment.**
The Windows CNG public key and signatures from M11 are NOT transmitted or verified by the Node agent.
A device name and shared lab key are not sufficient to prove unique device identity.
Native mouse and keyboard control is NOT implemented. Do not enable control on this basis.
Next: device key registration and signed challenge-response, then authorization and native control agent.
