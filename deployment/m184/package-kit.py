"""Package generic helpers only. A real teacher profile must never be published."""
from pathlib import Path
import sys,zipfile,hashlib
output=Path(sys.argv[1]);sources=Path(__file__).resolve().parent
files=['FBS-LabSetup-Windows.exe','FBS-LabSetup-Mac','Prepare-Teacher-Windows.cmd','Prepare-Teacher-Mac.command','Setup-Student-Windows.cmd','Setup-Student-Mac.command','README-AR.md']
assert not (output/'lab-profile.json').exists(),'Refuse real profile in public output'
archive=output/'FBS-Classroom-M184-Lab-Setup-Kit.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for name in files:
  p=(output if name in files[:2] else sources)/name
  data=p.read_bytes();assert data,name
  i=zipfile.ZipInfo('FBS-Lab-Setup/'+name);i.create_system=3;i.compress_type=zipfile.ZIP_DEFLATED
  i.external_attr=((0o100755 if name.endswith('.command') or name=='FBS-LabSetup-Mac' else 0o100644)<<16)
  z.writestr(i,data)
 for name in ['Mac-provisioning-checks.log','Windows-provisioning-checks.log']:
  z.write(output/name,'FBS-Lab-Setup/Tests/'+name)
with zipfile.ZipFile(archive) as z:
 assert len(z.namelist())==9 and all('lab-profile' not in n for n in z.namelist())
(output/'SHA256SUMS.txt').write_text(hashlib.sha256(archive.read_bytes()).hexdigest()+'  '+archive.name+'\n')
print('Generic kit bytes:',archive.stat().st_size,'No lab profile included.')
