#!/bin/bash
set -uo pipefail
cd "$(dirname "$0")" || exit 1
./FBS-LabSetup-Mac import "$PWD/lab-profile.json"
fbs_setup_result=$?
if [[ "$fbs_setup_result" != 0 ]]; then echo 'أغلق تطبيق الطالب وراجع README-AR.md. شغّل الأداة بحساب الطالب دون sudo.'; fi
read -r -p 'اضغط Enter للإغلاق... ' fbs_setup_answer
exit "$fbs_setup_result"
