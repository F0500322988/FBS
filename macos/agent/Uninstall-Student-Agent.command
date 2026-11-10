#!/bin/bash
set -euo pipefail
fbs_agent_plist=/Library/LaunchAgents/com.fbsclassroom.student.agent.plist
# Named managed login item only; no user configuration or Keychain deletion.
/usr/bin/sudo /bin/launchctl bootout "gui/$(/usr/bin/stat -f %u /dev/console)/com.fbsclassroom.student.agent" 2>/dev/null || true
/usr/bin/sudo /bin/rm -f "$fbs_agent_plist"
printf 'FBS Classroom login agent removed. Close the student application before removing its app bundle. Saved settings were retained.\n'
