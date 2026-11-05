@echo off
chcp 65001 >nul
cd /d "%~dp0"
"%~dp0FBS-LabSetup-Windows.exe" import "%~dp0lab-profile.json"
set "FBS_SETUP_RESULT=%ERRORLEVEL%"
if not "%FBS_SETUP_RESULT%"=="0" echo أغلق تطبيق الطالب وراجع README-AR.md. لا تُحذف إعدادات موجودة تلقائيًا.
pause
exit /b %FBS_SETUP_RESULT%
