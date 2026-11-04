"""Compare the actual expanded PKG payload to the signed application bundle."""
import hashlib,json,pathlib,sys
app,expanded,report=map(pathlib.Path,sys.argv[1:])
matches=[p for p in expanded.rglob(app.name) if p.is_dir()]
if len(matches)!=1:raise SystemExit('Expected exactly one application in PKG payload')
def inventory(root):
 result={}
 for p in root.rglob('*'):
  if p.is_symlink():raise SystemExit('Unexpected payload symlink')
  if p.is_file():result[p.relative_to(root).as_posix()]={'size':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
 return result
expected,actual=inventory(app),inventory(matches[0])
if expected!=actual:raise SystemExit('Expanded PKG payload does not match built application')
report.write_text(json.dumps({'application':app.name,'allPayloadHashesVerified':True,'filesVerified':len(expected),'installExecuted':False,'files':expected},indent=2)+'\n')
print(app.name,':',len(expected),'payload files verified')
