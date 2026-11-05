#!/bin/bash
set -euo pipefail
fbs_kit_root="$(cd "$(dirname "$0")/../.." && pwd)"
fbs_kit_output="$1"
mkdir -p "$fbs_kit_output"
fbs_kit_work="$(mktemp -d "${TMPDIR:-/tmp}/fbs-m184-build.XXXXXX")"
for fbs_kit_arch in arm64 x86_64; do
  xcrun swiftc -swift-version 5 -target "$fbs_kit_arch-apple-macosx13.0" -sdk "$(xcrun --sdk macosx --show-sdk-path)" \
    -framework Foundation -framework Security -framework AppKit -framework CryptoKit \
    "$fbs_kit_root/macos/Sources/ConnectionConfig.swift" "$fbs_kit_root/macos/Sources/PlatformServices.swift" \
    "$fbs_kit_root/deployment/m184/LabSetup.swift" "$fbs_kit_root/deployment/m184/ProvisioningChecks.swift" \
    -o "$fbs_kit_work/FBS-LabSetup-$fbs_kit_arch"
done
lipo -create "$fbs_kit_work/FBS-LabSetup-arm64" "$fbs_kit_work/FBS-LabSetup-x86_64" -output "$fbs_kit_output/FBS-LabSetup-Mac"
codesign --force --sign - --timestamp=none "$fbs_kit_output/FBS-LabSetup-Mac"
lipo "$fbs_kit_output/FBS-LabSetup-Mac" -verify_arch arm64 x86_64
codesign --verify --strict "$fbs_kit_output/FBS-LabSetup-Mac"
"$fbs_kit_output/FBS-LabSetup-Mac" self-test | tee "$fbs_kit_output/Mac-provisioning-checks.log"
