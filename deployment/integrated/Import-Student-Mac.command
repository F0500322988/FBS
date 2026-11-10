#!/bin/bash
set -uo pipefail
cd "$(dirname "$0")" || exit 1
fbs_profile_path="$(/usr/bin/osascript -e 'POSIX path of (choose file with prompt "اختر lab-profile.json من حزمة المعلم الخاصة" of type {"public.json"})')" || exit 0
./FBS-LabSetup-Mac import "$fbs_profile_path"
fbs_setup_result=$?
read -r -p 'اضغط Enter للإغلاق... ' fbs_setup_answer
exit "$fbs_setup_result"
