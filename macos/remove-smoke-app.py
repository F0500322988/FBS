"""Remove only the exact verified files installed by the isolated CI smoke test."""
import hashlib,json,pathlib,sys
app,manifest=map(pathlib.Path,sys.argv[1:]);report=json.loads(manifest.read_text())
if app.parent!=pathlib.Path('/Applications') or app.name not in ('FBS Classroom Teacher.app','FBS Classroom Student.app') or report['application']!=app.name:raise SystemExit('Refusing unexpected cleanup target')
expected=report['files'];actual={};directories=[]
for p in app.rglob('*'):
 if p.is_symlink():raise SystemExit('Refusing symlink during test cleanup')
 if p.is_dir():directories.append(p)
 elif p.is_file():actual[p.relative_to(app).as_posix()]={'size':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
if actual!=expected:raise SystemExit('Installed application changed; refusing cleanup of unknown files')
for relative in expected:(app/relative).unlink()
for p in sorted(directories,key=lambda p:len(p.parts),reverse=True):p.rmdir()
app.rmdir()
print('Exact installed smoke-test application files removed; user settings were not accessed.')
