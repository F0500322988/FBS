"""Fetch the public, hash-pinned M184 kit; never accepts or packages a private lab profile."""
from pathlib import Path
import hashlib,json,sys,urllib.request,zipfile,io,stat,shutil
root=Path(__file__).resolve().parents[2];lock=json.loads((root/'deployment/integrated/kit-lock.json').read_text());dest=Path(sys.argv[1])
assert not dest.exists(),'Use a new kit destination'
raw=urllib.request.urlopen(lock['url'],timeout=180).read();assert hashlib.sha256(raw).hexdigest()==lock['sha256'],'Public kit hash mismatch'
files={'FBS-LabSetup-Windows.exe','FBS-LabSetup-Mac','Prepare-Teacher-Windows.cmd','Prepare-Teacher-Mac.command','Setup-Student-Windows.cmd','Setup-Student-Mac.command','README-AR.md','Tests/Mac-provisioning-checks.log','Tests/Windows-provisioning-checks.log'}
with zipfile.ZipFile(io.BytesIO(raw)) as z:
 assert len(z.infolist())==9 and {i.filename.removeprefix('FBS-Lab-Setup/') for i in z.infolist()}==files
 for i in z.infolist():
  assert i.filename.startswith('FBS-Lab-Setup/') and stat.S_ISREG(i.external_attr>>16)
  relative=i.filename.removeprefix('FBS-Lab-Setup/');assert '..' not in Path(relative).parts
  path=dest/relative;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(z.read(i));path.chmod(0o755 if relative.endswith('.command') or relative=='FBS-LabSetup-Mac' else 0o644)
for name,key in [('FBS-LabSetup-Windows.exe','windowsHelperSha256'),('FBS-LabSetup-Mac','macHelperSha256')]:assert hashlib.sha256((dest/name).read_bytes()).hexdigest()==lock[key]
shutil.copy2(root/'deployment/integrated/INTEGRATED-START-HERE-AR.md',dest/'INTEGRATED-START-HERE-AR.md')
assert not (dest/'lab-profile.json').exists()
print('Pinned public M184 kit extracted, helpers verified; no private lab profile.')
