"""Recover the exact verified M183 Windows payload and add only the public M184 kit."""
from pathlib import Path
import hashlib,json,shutil,subprocess,sys,urllib.request,os
repo=Path(__file__).resolve().parents[2];root=Path(sys.argv[1]);root.mkdir(exist_ok=False)
for role,digest in [('Teacher','58df89a0b0ec9bdca1551c57fdd8552706ab66d7e04c11275ee41589a8d48851'),('Student','2a7cb40cf74ca69dc07953de5e1ff8b8d5e9c9069c5bb666892ee00d2de667d7')]:
 exe=root/(role+'-M183.exe');url='https://github.com/F0500322988/FBS/raw/refs/heads/downloads/m183-preview/downloads/M183/FBS-Classroom-'+role+'-M183-Setup-PREVIEW.exe'
 with urllib.request.urlopen(url,timeout=180) as response,exe.open('wb') as target:shutil.copyfileobj(response,target)
 assert hashlib.sha256(exe.read_bytes()).hexdigest()==digest,'Baseline installer SHA mismatch'
 expanded=root/('baseline-'+role);subprocess.run(['7z','x',str(exe),'-o'+str(expanded),'-y'],check=True,stdout=subprocess.DEVNULL)
 manifest=json.loads((repo/f'windows/nsis/m183-ci/payload-{role}.json').read_text());assert manifest['version']=='0.183.0-preview' and manifest['role']==role
 for file in manifest['files']:
  relative=Path(file['path']);assert not relative.is_absolute() and '..' not in relative.parts and '\\' not in file['path']
  source=expanded/relative;assert source.is_file() and not source.is_symlink() and source.stat().st_size==file['size'] and hashlib.sha256(source.read_bytes()).hexdigest()==file['sha256'],'Baseline payload mismatch'
  if not os.environ.get('FBS_BUILD_CURRENT_CORE') and (file['path'].startswith('Runtime/public/') or file['path'].startswith('Runtime/') and file['path'].endswith('.js') and '/' not in file['path'][8:]):
   current=repo/file['path'][8:];assert hashlib.sha256(current.read_bytes()).hexdigest()==file['sha256'],'Pinned core differs from canonical shared source'
  destination=root/'stage'/role/relative;destination.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,destination)
kit=root/'public-kit';subprocess.run([sys.executable,str(repo/'deployment/integrated/fetch-kit.py'),str(kit)],check=True)
shutil.copy2(repo/'deployment/integrated/Import-Student-Profile.ps1',kit/'Import-Student-Profile.ps1')
for template in ['Prepare-Teacher-Windows.cmd','Prepare-Teacher-Mac.command','Setup-Student-Windows.cmd','Setup-Student-Mac.command','README-AR.md']:shutil.copy2(repo/'deployment/m184'/template,kit/template)
for role in ['Teacher','Student']:shutil.copytree(kit,root/'stage'/role/'SetupKit')
print('M183 pinned core and M184 pinned tools staged for both roles; no private profile.')

if os.environ.get('FBS_BUILD_CURRENT_CORE') == '1':
 for role,project in [('Teacher','FBS.Teacher.Launcher'),('Student','FBS.Student.Native')]:
  app=root/'stage'/role/role
  shutil.rmtree(app)
  subprocess.run(['dotnet','publish',str(repo/f'windows/{project}/{project}.csproj'),'-c','Release','-r','win-x64','--self-contained','true','-p:EnableWindowsTargeting=true','-o',str(app)],check=True)
  runtime=root/'stage'/role/'Runtime'
  for file in runtime.glob('*.js'):file.unlink()
  for file in repo.glob('*.js'):shutil.copy2(file,runtime/file.name)
  shutil.rmtree(runtime/'public');shutil.copytree(repo/'public',runtime/'public')
  if role == 'Student':shutil.copy2(repo/'windows/Configure-Student.ps1',root/'stage'/role/'Configure-Student.ps1')
 helper=root/'current-windows-helper'
 if os.environ.get('FBS_CURRENT_WINDOWS_HELPER'):
  helper.mkdir();shutil.copy2(os.environ['FBS_CURRENT_WINDOWS_HELPER'],helper/'FBS.LabSetup.exe')
 else:
  subprocess.run(['dotnet','publish',str(repo/'windows/FBS.LabSetup/FBS.LabSetup.csproj'),'-c','Release','-r','win-x64','--self-contained','true','-p:EnableWindowsTargeting=true','-p:PublishSingleFile=true','-p:IncludeNativeLibrariesForSelfExtract=true','-o',str(helper)],check=True)
 mac=Path(os.environ['FBS_CURRENT_MAC_HELPER']);assert mac.is_file()
 for role in ['Teacher','Student']:
  target=root/'stage'/role/'SetupKit'
  shutil.copy2(helper/'FBS.LabSetup.exe',target/'FBS-LabSetup-Windows.exe')
  shutil.copy2(mac,target/'FBS-LabSetup-Mac')
  shutil.copy2(repo/'M189-START-HERE.md',target/'M189-START-HERE.md')
  shutil.copy2(repo/'deployment/m184/README-AR.md',target/'README-AR.md')
  # Old evidence describes the locked bootstrap helper, not the rebuilt binaries.
  shutil.rmtree(target/'Tests')
 print('M185: fresh native apps, current shared runtime and source-built setup helpers staged.')
