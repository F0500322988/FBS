@echo off
setlocal
if not exist "%~dp0Checks\FBS.WindowsSetup.Tests.exe" (
  echo Missing Checks\FBS.WindowsSetup.Tests.exe. Extract the entire ZIP first.
  pause
  exit /b 1
)
echo Testing Windows DPAPI and PowerShell compatibility with disposable test data.
echo Existing classroom settings will not be changed.
set "fbs_reports=%LOCALAPPDATA%\FBSClassroom\Reports"
if not exist "%fbs_reports%" mkdir "%fbs_reports%"
"%~dp0Checks\FBS.WindowsSetup.Tests.exe" "%fbs_reports%\windows-setup-latest.json"
set "fbs_result=%ERRORLEVEL%"
echo Test exit code: %fbs_result%
echo Report: "%fbs_reports%\windows-setup-latest.json"
echo Please report the PASS lines or the first FAIL message. Do not send any passwords or lab keys.
pause
exit /b %fbs_result%
