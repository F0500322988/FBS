#!/bin/bash
set -uo pipefail
cd "$(dirname "$0")" || exit 1
./FBS-LabSetup-Mac export
fbs_setup_result=$?
if [[ "$fbs_setup_result" != 0 ]]; then echo 'راجع README-AR.md وشغّل الأداة بحساب المعلم دون sudo.'; fi
read -r -p 'اضغط Enter للإغلاق... ' fbs_setup_answer
exit "$fbs_setup_result"
