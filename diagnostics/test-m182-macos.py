#!/usr/bin/env python3
"""Read-only bundle/runtime checks. Does not grant TCC, control input, or lock the Mac."""
import argparse,json,pathlib,platform,subprocess,uuid
p=argparse.ArgumentParser();p.add_argument('--role',choices=['Teacher','Student'],default='Student');p.add_argument('--manual',action='store_true');a=p.parse_args()
r={'stage':'M182','platform':'macOS','role':a.role,'os':platform.mac_ver()[0],'architecture':platform.machine(),'userRunReport':True,'physicalHardwareVerified':False,'automatic':{},'userReported':{},'secretsCollected':False}
app=pathlib.Path('/Applications')/('FBS Classroom '+a.role+'.app')
try:
 import plistlib
 meta=plistlib.loads((app/'Contents/Info.plist').read_bytes());r['automatic']['correctVersion']=meta.get('CFBundleShortVersionString')=='0.182.0'
 if not r['automatic']['correctVersion']:raise ValueError('M182 is not installed')
 check=subprocess.run(['/usr/bin/codesign','--verify','--deep','--strict',str(app)],capture_output=True,timeout=25);r['automatic']['signatureIntegrity']=check.returncode==0
 check=subprocess.run([str(app/'Contents/MacOS/FBSClassroom'),'--self-check'],capture_output=True,text=True,timeout=30)
 data=json.loads(check.stdout) if check.returncode==0 else {}
 r['automatic']['bundleSelfCheck']=check.returncode==0 and data.get('nativeBundleSelfCheck') is True
 r['automatic']['isolatedLoopbackHTTP']=data.get('loopbackHTTPTested') is True
 r['automatic']['bundledNode']=data.get('nodeVersion')=='22.23.4'
except Exception as e:r['automatic']['setupOrSelfCheckPassed']=False;r['automatic']['failureType']=type(e).__name__
for name in ['teacherStudentOnSameLAN','teacherFingerprintComparedLocally','studentApproved','broadcastStartsWithoutStudentPrompt','broadcastFillsScreen','teacherStopsBroadcast','broadcastExitsOnNetworkLoss','powerInventorySaved','automationPermissionGrantedLocally','sleepRequest','wakeFromSleep','restartRequest','shutdownRequest','powerOnFromFullShutdown']:
 r['userReported'][name]='not-run'
 if a.manual:
  v=input(name+' : PASS / FAIL / SKIP: ').strip().upper();r['userReported'][name]={'PASS':'user-reported-pass','FAIL':'user-reported-fail'}.get(v,'not-run')
out=pathlib.Path.cwd()/('FBS-M182-macOS-'+a.role+'-'+uuid.uuid4().hex+'.json');out.write_text(json.dumps(r,indent=2)+'\n');print('Saved report:',out)
print('No passwords, lab keys, identity files, TLS private keys or screenshots collected. Bundle self-check does not test live LAN or TCC permissions.')
