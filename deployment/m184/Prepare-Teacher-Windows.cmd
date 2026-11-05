@echo off
chcp 65001 >nul
cd /d "%~dp0"
"%~dp0FBS-LabSetup-Windows.exe" export
set "FBS_SETUP_RESULT=%ERRORLEVEL%"
if not "%FBS_SETUP_RESULT%"=="0" echo راجع README-AR.md وتحقق من تشغيل الأداة بحساب المعلم.
pause
exit /b %FBS_SETUP_RESULT%
