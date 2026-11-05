@echo off
setlocal
pushd "%~dp0Runtime" || exit /b 1
if not exist node.exe (
  echo Missing Runtime\node.exe. Extract the entire trial ZIP first.
  popd
  pause
  exit /b 1
)
set FBS_DEMO=1
set FBS_TEACHER_PASSWORD=
set PORT=4177
echo FBS Classroom - simulated devices only.
echo After the server starts, open http://127.0.0.1:4177 in your browser.
echo Keep this window open. Press Ctrl+C to stop.
node.exe server.js
set "fbs_result=%ERRORLEVEL%"
popd
pause
exit /b %fbs_result%
