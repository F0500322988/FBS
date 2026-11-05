#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
fbs_role="${1:-Student}"
case "$fbs_role" in Teacher|Student) ;; *) echo 'Use Teacher or Student'; exit 2;; esac
fbs_app="/Applications/FBS Classroom $fbs_role.app"
fbs_report="FBS-M181-Mac-$fbs_role-$(/usr/bin/uuidgen).json"
fbs_ok=false
if [[ "$(/usr/bin/uname -s)" == Darwin && -d "$fbs_app" ]]; then
 fbs_version="$(/usr/libexec/PlistBuddy -c 'Print CFBundleShortVersionString' "$fbs_app/Contents/Info.plist" 2>/dev/null || true)"
 if [[ "$fbs_version" == '0.181.0' ]] && /usr/bin/codesign --verify --deep --strict "$fbs_app"; then
  if "$fbs_app/Contents/MacOS/FBSClassroom" --self-check > "$fbs_report.native.json"; then fbs_ok=true; fi
 fi
fi
printf '{"stage":"M181","platform":"macOS","role":"%s","userRunReport":true,"physicalHardwareVerified":false,"versionSignatureAndBundleSelfCheckPassed":%s,"liveLANTested":false,"accessibilityInputTested":false,"systemLockTested":false,"manualChecks":"not-run","secretsCollected":false}\n' "$fbs_role" "$fbs_ok" > "$fbs_report"
echo "Saved: $fbs_report"
echo 'Send this report and its .native.json file, if present. The automatic check does not test your live LAN, input permissions, or account lock.'
read -r -p 'Press Enter to close... ' fbs_answer
