#!/usr/bin/env bash
set -euo pipefail
if [[ "$(uname -s)" != Darwin ]]; then echo 'macOS and Xcode command-line tools are required; no PKG/DMG was built.' >&2; exit 2; fi
fbs_mac_root="$(cd "$(dirname "$0")/.." && pwd)"
fbs_mac_output="${1:-$fbs_mac_root/macos-dist}"
mkdir -p "$fbs_mac_output"
if [[ -n "$(find "$fbs_mac_output" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then echo 'Output must be a fresh empty directory.' >&2; exit 2; fi
fbs_mac_output="$(cd "$fbs_mac_output" && pwd)"
fbs_mac_work="$(mktemp -d "${TMPDIR:-/tmp}/fbs-mac-build.XXXXXX")"
trap 'rm -rf "$fbs_mac_work"' EXIT
fbs_mac_sdk="$(xcrun --sdk macosx --show-sdk-path)"
for fbs_arch in arm64 x86_64; do
  xcrun swiftc -swift-version 5 -O -target "$fbs_arch-apple-macosx13.0" -sdk "$fbs_mac_sdk" \
    -framework AppKit -framework Security -framework CryptoKit "$fbs_mac_root"/macos/Sources/*.swift -o "$fbs_mac_work/FBS-$fbs_arch"
done
xcrun lipo -create "$fbs_mac_work/FBS-arm64" "$fbs_mac_work/FBS-x86_64" -output "$fbs_mac_work/FBSClassroom"
xcrun lipo -verify_arch arm64 x86_64 "$fbs_mac_work/FBSClassroom"
python3 "$fbs_mac_root/macos/Tests/test_payload.py"
xcrun swiftc -swift-version 5 "$fbs_mac_root/macos/Sources/ConnectionConfig.swift" "$fbs_mac_root/macos/Tests/ConfigTests.swift" -o "$fbs_mac_work/config-tests"
"$fbs_mac_work/config-tests" | tee "$fbs_mac_output/swift-config-tests.json"
for fbs_arch in arm64 x64; do
  fbs_mac_archive="node-v22.23.4-darwin-$fbs_arch.tar.gz"
  fbs_mac_hash="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["darwin-"+sys.argv[2]]["sha256"])' "$fbs_mac_root/macos/runtime-lock.json" "$fbs_arch")"
  curl --fail --location --retry 3 --silent --show-error "https://nodejs.org/dist/v22.23.4/$fbs_mac_archive" --output "$fbs_mac_work/$fbs_mac_archive"
  printf '%s  %s\n' "$fbs_mac_hash" "$fbs_mac_work/$fbs_mac_archive" | shasum -a 256 --check
  tar -xzf "$fbs_mac_work/$fbs_mac_archive" -C "$fbs_mac_work"
done
for fbs_role in Teacher Student; do
  fbs_role_lower="$(printf '%s' "$fbs_role" | tr '[:upper:]' '[:lower:]')"
  fbs_mac_app="$fbs_mac_work/$fbs_role-root/FBS Classroom $fbs_role.app"
  mkdir -p "$fbs_mac_app/Contents/MacOS" "$fbs_mac_app/Contents/Resources/Runtime/public"
  cp "$fbs_mac_work/FBSClassroom" "$fbs_mac_app/Contents/MacOS/FBSClassroom"
  cp "$fbs_mac_root"/*.js "$fbs_mac_app/Contents/Resources/Runtime/"
  cp "$fbs_mac_root"/public/* "$fbs_mac_app/Contents/Resources/Runtime/public/"
  for fbs_arch in arm64 x64; do
    cp "$fbs_mac_work/node-v22.23.4-darwin-$fbs_arch/bin/node" "$fbs_mac_app/Contents/Resources/Runtime/node-$fbs_arch"
    chmod 755 "$fbs_mac_app/Contents/Resources/Runtime/node-$fbs_arch"
    codesign --force --sign - --timestamp=none "$fbs_mac_app/Contents/Resources/Runtime/node-$fbs_arch"
  done
  cp "$fbs_mac_work/node-v22.23.4-darwin-arm64/LICENSE" "$fbs_mac_app/Contents/Resources/Runtime/Node-LICENSE.txt"
  python3 - "$fbs_mac_app/Contents/Info.plist" "$fbs_role" "$fbs_role_lower" <<'PY'
import plistlib,sys
plist={'CFBundleExecutable':'FBSClassroom','CFBundleIdentifier':'com.fbsclassroom.'+sys.argv[3]+'.preview','CFBundleName':'FBS Classroom '+sys.argv[2],'CFBundlePackageType':'APPL','CFBundleShortVersionString':'0.175.0','CFBundleVersion':'0.175.0','LSMinimumSystemVersion':'13.0','NSHighResolutionCapable':True,'NSLocalNetworkUsageDescription':'يحتاج FBS Classroom إلى الاتصال بأجهزة المعمل داخل الشبكة المحلية.','FBSRole':sys.argv[3],'NSAppTransportSecurity':{'NSAllowsLocalNetworking':True}}
with open(sys.argv[1],'wb') as stream:plistlib.dump(plist,stream)
PY
  chmod 755 "$fbs_mac_app/Contents/MacOS/FBSClassroom"
  codesign --force --sign - --timestamp=none "$fbs_mac_app"
  codesign --verify --deep --strict --verbose=2 "$fbs_mac_app"
  "$fbs_mac_app/Contents/MacOS/FBSClassroom" --self-check > "$fbs_mac_output/$fbs_role-bundle-self-check.json"
  fbs_mac_pkg="$fbs_mac_output/FBS-Classroom-$fbs_role-M175-macOS-Universal-PREVIEW.pkg"
  pkgbuild --root "$fbs_mac_work/$fbs_role-root" --identifier "com.fbsclassroom.$fbs_role_lower.preview" --version 0.175.0 --install-location /Applications --ownership recommended "$fbs_mac_pkg"
  mkdir -p "$fbs_mac_work/$fbs_role-dmg"
  ditto "$fbs_mac_app" "$fbs_mac_work/$fbs_role-dmg/FBS Classroom $fbs_role.app"
  ln -s /Applications "$fbs_mac_work/$fbs_role-dmg/Applications"
  fbs_mac_dmg="$fbs_mac_output/FBS-Classroom-$fbs_role-M175-macOS-Universal-PREVIEW.dmg"
  hdiutil create -srcfolder "$fbs_mac_work/$fbs_role-dmg" -volname "FBS Classroom $fbs_role M175" -format UDZO "$fbs_mac_dmg"
  hdiutil verify "$fbs_mac_dmg"
  pkgutil --expand-full "$fbs_mac_pkg" "$fbs_mac_work/$fbs_role-expanded"
  python3 "$fbs_mac_root/macos/verify-payload.py" "$fbs_mac_app" "$fbs_mac_work/$fbs_role-expanded" "$fbs_mac_output/$fbs_role-payload-verification.json"
done
(cd "$fbs_mac_output" && shasum -a 256 ./*.pkg ./*.dmg > SHA256SUMS.txt)
python3 - "$fbs_mac_output" <<'PY'
import json,pathlib,sys,platform
out=pathlib.Path(sys.argv[1]);report={'stage':'M175','platform':'macOS','minimumOS':'13.0','architectures':['arm64','x86_64'],'nativeBuildPassed':True,'selfCheckHostArchitecture':platform.machine(),'otherArchitectureExecuted':False,'pkgPayloadVerified':True,'dmgVerified':True,'bundleAdHocSigned':True,'developerIDSigned':False,'notarized':False,'guiTested':False,'keychainTested':False,'screenRecordingTested':False,'twoMacLanTested':False,'installedOnMacTested':False,'files':[p.name for p in sorted(out.glob('*')) if p.suffix in ('.pkg','.dmg')]};(out/'macOS-validation.json').write_text(json.dumps(report,indent=2)+'\n')
PY
