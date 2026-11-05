#!/bin/bash
set -euo pipefail
fbs_kit_root="$(cd "$(dirname "$0")/../.." && pwd)"
fbs_kit_output="$1"
mkdir -p "$fbs_kit_output"
fbs_kit_work="$(mktemp -d "${TMPDIR:-/tmp}/fbs-m184-build.XXXXXX")"
if [[ -n "${FBS_EXISTING_KIT_HELPER:-}" ]]; then
  cp "$FBS_EXISTING_KIT_HELPER" "$fbs_kit_output/FBS-LabSetup-Mac"
else
for fbs_kit_arch in arm64 x86_64; do
  xcrun swiftc -swift-version 5 -target "$fbs_kit_arch-apple-macosx13.0" -sdk "$(xcrun --sdk macosx --show-sdk-path)" \
    -framework Foundation -framework Security -framework AppKit -framework CryptoKit \
    "$fbs_kit_root/macos/Sources/ConnectionConfig.swift" "$fbs_kit_root/macos/Sources/PlatformServices.swift" \
    "$fbs_kit_root/deployment/m184/LabSetup.swift" "$fbs_kit_root/deployment/m184/ProvisioningChecks.swift" \
    -o "$fbs_kit_work/FBS-LabSetup-$fbs_kit_arch"
done
lipo -create "$fbs_kit_work/FBS-LabSetup-arm64" "$fbs_kit_work/FBS-LabSetup-x86_64" -output "$fbs_kit_output/FBS-LabSetup-Mac"
codesign --force --sign - --timestamp=none "$fbs_kit_output/FBS-LabSetup-Mac"
fi
lipo "$fbs_kit_output/FBS-LabSetup-Mac" -verify_arch arm64 x86_64
codesign --verify --strict "$fbs_kit_output/FBS-LabSetup-Mac"
xcrun swiftc -swift-version 5 -framework Foundation -framework Security "$fbs_kit_root/macos/Sources/ConnectionConfig.swift" "$fbs_kit_root/deployment/m184/KeychainConsumerCheck.swift" -o "$fbs_kit_work/keychain-consumer"
codesign --force --sign - --timestamp=none "$fbs_kit_work/keychain-consumer"
# Give CI a private, unlocked test keychain; never depend on the runner's login UI.
python3 - "$fbs_kit_work/keychain-before.json" <<'PYTHON'
import json,subprocess,shlex,sys
get=lambda *args:shlex.split(subprocess.check_output(['/usr/bin/security',*args],text=True).strip())
json.dump({'default':get('default-keychain','-d','user'),'search':get('list-keychains','-d','user')},open(sys.argv[1],'w'))
PYTHON
fbs_kit_keychain="$fbs_kit_work/fixture.keychain-db"
fbs_kit_fixture_password="$(/usr/bin/uuidgen)"
/usr/bin/security create-keychain -p "$fbs_kit_fixture_password" "$fbs_kit_keychain"
fbs_restore_keychain() {
  python3 - "$fbs_kit_work/keychain-before.json" "$fbs_kit_keychain" <<'PYTHON'
import json,subprocess,sys
old=json.load(open(sys.argv[1]))
def run(args):subprocess.run(['/usr/bin/security',*args],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=False)
run(['list-keychains','-d','user','-s',*old['search']])
if old['default']:run(['default-keychain','-d','user','-s',old['default'][0]])
run(['delete-keychain',sys.argv[2]])
PYTHON
}
trap fbs_restore_keychain EXIT
/usr/bin/security unlock-keychain -p "$fbs_kit_fixture_password" "$fbs_kit_keychain"
/usr/bin/security set-keychain-settings -lut 1800 "$fbs_kit_keychain"
/usr/bin/security list-keychains -d user -s "$fbs_kit_keychain"
/usr/bin/security default-keychain -d user -s "$fbs_kit_keychain"
unset fbs_kit_fixture_password
FBS_PROVISIONING_TEST_READER="$fbs_kit_work/keychain-consumer" "$fbs_kit_output/FBS-LabSetup-Mac" self-test | tee "$fbs_kit_output/Mac-provisioning-checks.log"
